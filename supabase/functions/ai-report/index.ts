import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function main(req: Request): Promise<Response> {
  const { query } = await req.json();

  // Step 1: Ask GPT to generate SQL
  const sqlPrompt = `
  You are a SQL generator for a PostgreSQL inventory database. 
  Convert the following user request into a SQL query.
  User request: "${query}"
  Only return SQL code.
  `;

  const sqlResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: sqlPrompt }],
  });

  const sql = sqlResponse.choices[0].message.content?.trim();

  // Step 2: Execute SQL in Supabase
  const { data, error } = await supabase.rpc("run_dynamic_query", { sql_query: sql });

  if (error) return new Response(JSON.stringify({ error }), { status: 400 });

  // Step 3: Summarize or format
  const summaryPrompt = `
  Here is the data from SQL: ${JSON.stringify(data)}
  Summarize and explain it briefly.
  `;

  const summaryResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: summaryPrompt }],
  });

  const answer = summaryResponse.choices[0].message.content?.trim();

  return new Response(JSON.stringify({ answer, sql, data }), { status: 200 });
}
