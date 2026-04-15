import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_CONTEXT = `You are an expert SQL assistant for an ERP/Inventory Management System (Quantom IMS) built on PostgreSQL.

KEY TABLES AND THEIR COLUMNS:

items(id uuid PK, sku text, name text, category uuid FK->categories, price numeric, cost numeric, quantity numeric, min_stock numeric, unit text, supplier uuid FK->suppliers, brand uuid, color uuid, size uuid, season uuid, origin uuid, gender uuid, main_group uuid FK->main_groups, created_at, updated_at)

store_inventory(id uuid PK, item_id uuid FK->items, store_id uuid FK->stores, quantity numeric, qty_on_order int, variant_id uuid, updated_at)

stores(id uuid PK, name text, location text)

suppliers(id uuid PK, name text, email text, phone text, status text, payment_terms text, vendor_code text, contact_person text)

purchase_orders(po_id int PK, po_number text, supplier_id text, supplier text, store_id uuid FK->stores, order_date date, status varchar, total_cost numeric, total_items int, currency text)

purchase_order_items(id uuid PK, po_id int FK->purchase_orders, sku text, item_name text, item_id text, quantity int, cost_price numeric, received_quantity int, color text, size text)

transactions(id uuid PK, transaction_id text, sku text, item_id uuid, quantity int, price numeric, amount numeric, discount_percent numeric, discount_fixed numeric, payment_method text, is_refund bool, is_refunded bool, session_id uuid FK->cash_sessions, cashier_id text, customer_id int, created_at)

cash_sessions(id uuid PK, cashier_id text, store_id uuid FK->stores, start_cash numeric, end_cash numeric, open_at timestamptz, close_at timestamptz)

customers(id int PK, name varchar, email varchar, phone varchar, company_name varchar, customer_type varchar, loyalty_points int, credit_limit numeric, outstanding_balance numeric, status varchar)

transfers(transfer_id int PK, transfer_number text, from_store_id uuid FK->stores, to_store_id uuid FK->stores, status varchar, total_items int, request_date, shipped_at, received_at)

transfer_items(id uuid PK, transfer_id int FK->transfers, item_id uuid FK->items, requested_quantity int, approved_quantity int, shipped_quantity int, received_quantity int)

categories(id uuid PK, name text, main_group_id uuid FK->main_groups)
main_groups(id uuid PK, name text)
brands(id uuid PK, name text)
colors(id uuid PK, name text)
sizes(id uuid PK, name text)
seasons(id uuid PK, name text)

sales_orders(id uuid PK, order_number varchar, customer_id int FK->customers, store_id uuid FK->stores, order_date date, status varchar, total_amount numeric, subtotal numeric, tax_amount numeric)

sales_order_items(id uuid PK, sales_order_id uuid FK->sales_orders, item_id uuid, sku varchar, item_name varchar, quantity int, unit_price numeric, line_total numeric)

vendor_bills(id uuid PK, bill_number text, supplier_id uuid FK->suppliers, bill_date date, due_date date, total_amount numeric, paid_amount numeric, balance numeric, status text)

accounts(id uuid PK, account_code text, account_name text, account_type text, is_active bool)

journal_entries(id uuid PK, entry_number text, entry_date date, description text, status text, total_debit numeric, total_credit numeric)

physical_inventory_sessions(id uuid PK, session_number text, store_id uuid FK->stores, status text, count_date date, count_type text)

physical_inventory_counts(id uuid PK, session_id uuid FK->physical_inventory_sessions, item_id uuid FK->items, system_quantity numeric, counted_quantity numeric, variance numeric, variance_percentage numeric, status text)

variants(variant_id int PK, product_id int, sku varchar, color varchar, size varchar, season varchar, cost numeric, selling_price numeric, cost_price numeric)

RULES:
1. ONLY generate SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE.
2. Always LIMIT results to 200 rows max.
3. Use proper JOINs when referencing related tables.
4. Return clean, readable column aliases.
5. For monetary values, round to 2 decimal places.
6. When user asks about "inventory", query store_inventory joined with items and stores.
7. When user asks about "sales" or "POS", query transactions joined with cash_sessions and stores.
8. When user asks about "purchase orders" or "PO", query purchase_orders joined with purchase_order_items.
9. For date filtering, use PostgreSQL date functions.
10. Return ONLY the SQL query, no explanation, no markdown, no code fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Use AI to generate SQL from user question
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let sql = aiData.choices?.[0]?.message?.content?.trim() || "";

    // Clean up any markdown code fences
    sql = sql.replace(/```sql\n?/gi, "").replace(/```\n?/g, "").trim();

    // Security: verify it's a SELECT query
    const upperSql = sql.toUpperCase().trim();
    if (!upperSql.startsWith("SELECT") && !upperSql.startsWith("WITH")) {
      return new Response(JSON.stringify({ error: "Only SELECT queries are allowed", sql }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dangerous = /(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE)\s/i;
    if (dangerous.test(sql)) {
      return new Response(JSON.stringify({ error: "Query contains prohibited operations", sql }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure LIMIT exists
    if (!/LIMIT\s+\d+/i.test(sql)) {
      sql += " LIMIT 200";
    }

    // Step 2: Execute the SQL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use the REST API to execute raw SQL via the pg_net approach
    // Actually, use supabase-js rpc or direct postgrest isn't suitable for raw SQL
    // Let's use the management API or a simpler approach with supabase client

    // Execute via Supabase's built-in SQL execution
    const pgResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    });

    // If execute_sql RPC doesn't exist or fails, try direct approach
    if (!pgResponse.ok) {
      // Try using the supabase client with a different approach
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Use a workaround: create a temporary function or use the SQL API
      // For now, let's parse the SQL and use PostgREST when possible
      // Actually, let's just run it through the pg endpoint
      const pgEndpoint = `${supabaseUrl}/pg`;
      const pgResp = await fetch(pgEndpoint, {
        method: "POST",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!pgResp.ok) {
        // Final fallback: use the execute_sql function that exists in the DB
        const { data, error } = await supabase.rpc("execute_sql", { sql });
        
        if (error) {
          console.error("SQL execution error:", error);
          return new Response(JSON.stringify({ 
            error: "Failed to execute query: " + error.message, 
            sql 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ sql, data: data || [], rowCount: Array.isArray(data) ? data.length : 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pgData = await pgResp.json();
      return new Response(JSON.stringify({ sql, data: pgData || [], rowCount: Array.isArray(pgData) ? pgData.length : 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultData = await pgResponse.json();
    return new Response(JSON.stringify({ sql, data: resultData || [], rowCount: Array.isArray(resultData) ? resultData.length : 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("AI report error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
