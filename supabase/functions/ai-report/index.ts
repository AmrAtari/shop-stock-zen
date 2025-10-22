import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  try {
    const { question } = await req.json();

    const prompt = `
You are an AI SQL assistant for a professional inventory management system (Quantom IMS).
The database includes tables: products(id, name, category_id, price, cost, stock, reorder_level),
categories(id, name), sales(id, product_id, quantity, total, date, customer_id), customers(id, name, region).
User asked: "${question}".
Return a valid PostgreSQL SELECT query (read-only, max 100 rows) that answers the question.
Only SELECT queries are allowed.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const sql = completion.choices[0].message.content?.trim() || "";

    // Run SQL safely
    const { data, error } = await supabase.rpc("run_sql_query", { sql_query: sql });

    if (error) throw error;

    return new Response(JSON.stringify({ sql, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400 });
  }
});
