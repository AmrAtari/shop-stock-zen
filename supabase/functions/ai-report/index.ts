import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_CONTEXT = `You are an expert SQL assistant for an ERP/Inventory Management System built on PostgreSQL.

KEY TABLES:
- items(id uuid, sku text, name text, category uuid, price numeric, cost numeric, quantity numeric, min_stock numeric, unit text, supplier uuid, created_at timestamptz)
- store_inventory(id uuid, item_id uuid, store_id uuid, quantity numeric, qty_on_order int)
- stores(id uuid, name text, location text)
- suppliers(id uuid, name text, email text, phone text, status text, vendor_code text)
- purchase_orders(po_id int, po_number text, supplier_id text, supplier text, store_id uuid, order_date date, status varchar, total_cost numeric, total_items int)
- purchase_order_items(id uuid, po_id int, sku text, item_name text, item_id text, quantity int, cost_price numeric, received_quantity int)
- transactions(id uuid, transaction_id text, sku text, item_id uuid, quantity int, price numeric, amount numeric, discount_percent numeric, payment_method text, is_refund bool, session_id uuid, cashier_id text, customer_id int, created_at timestamptz)
- cash_sessions(id uuid, cashier_id text, store_id uuid, start_cash numeric, end_cash numeric, open_at timestamptz, close_at timestamptz)
- customers(id int, name varchar, email varchar, phone varchar, company_name varchar, customer_type varchar, loyalty_points int, credit_limit numeric, outstanding_balance numeric, status varchar)
- transfers(transfer_id int, transfer_number text, from_store_id uuid, to_store_id uuid, status varchar, total_items int, request_date timestamptz)
- transfer_items(id uuid, transfer_id int, item_id uuid, requested_quantity int, received_quantity int)
- categories(id uuid, name text, main_group_id uuid)
- main_groups(id uuid, name text)
- brands(id uuid, name text)
- sales_orders(id uuid, order_number varchar, customer_id int, store_id uuid, order_date date, status varchar, total_amount numeric)
- sales_order_items(id uuid, sales_order_id uuid, item_id uuid, sku varchar, item_name varchar, quantity int, unit_price numeric, line_total numeric)
- vendor_bills(id uuid, bill_number text, supplier_id uuid, bill_date date, due_date date, total_amount numeric, paid_amount numeric, balance numeric, status text)
- physical_inventory_sessions(id uuid, session_number text, store_id uuid, status text, count_date date)
- physical_inventory_counts(id uuid, session_id uuid, item_id uuid, system_quantity numeric, counted_quantity numeric, variance numeric)

RULES:
1. ONLY generate SELECT queries. Never INSERT/UPDATE/DELETE/DROP/ALTER.
2. Always LIMIT to 200 rows max.
3. Use JOINs for related tables. Use meaningful column aliases.
4. Round monetary values to 2 decimal places.
5. Return ONLY the raw SQL. No explanations, no markdown, no code fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: AI generates SQL
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SCHEMA_CONTEXT },
          { role: "user", content: question },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const s = aiResp.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error:", s, await aiResp.text());
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    let sql = (aiData.choices?.[0]?.message?.content || "").trim();
    sql = sql.replace(/```sql\n?/gi, "").replace(/```\n?/g, "").trim();

    // Security checks
    const upper = sql.toUpperCase().trim();
    if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
      return new Response(JSON.stringify({ error: "Only SELECT queries allowed", sql }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (/(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\s/i.test(sql)) {
      return new Response(JSON.stringify({ error: "Query contains prohibited operations", sql }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!/LIMIT\s+\d+/i.test(sql)) sql += " LIMIT 200";

    // Step 2: Execute via the readonly function
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.rpc("execute_readonly_sql", { query: sql });

    if (error) {
      console.error("SQL exec error:", error.message);
      return new Response(JSON.stringify({ error: "Query failed: " + error.message, sql }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = Array.isArray(data) ? data : [];
    return new Response(JSON.stringify({ sql, data: rows, rowCount: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("ai-report error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
