import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { userId, password, role } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // important: use service role key
    );

    // 1️⃣ Create the user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${userId}@yourdomain.com`,
      password,
      user_metadata: { role },
    });

    if (error) throw error;

    // 2️⃣ Add a record in your "user_roles" table
    await supabaseAdmin.from("user_roles").insert({
      user_id: data.user?.id,
      role,
    });

    return new Response(
      JSON.stringify({ message: "User created successfully" }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

