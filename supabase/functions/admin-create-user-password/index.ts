import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Creating user with password...");
    const { userId, password, role } = await req.json();
    console.log("Received data:", { userId, role });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // important: use service role key
    );

    // 1️⃣ Create the user in Supabase Auth
    console.log("Creating user in Supabase Auth...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${userId}@yourdomain.com`,
      password,
      email_confirm: true,
      user_metadata: { role },
    });

    if (error) {
      console.error("Auth error:", error);
      throw error;
    }

    console.log("User created in Auth, now adding role...");
    
    // 2️⃣ Add a record in your "user_roles" table
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.user?.id,
      role,
    });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      throw roleError;
    }

    console.log("User created successfully!");
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "User created successfully",
        user: data.user 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create user" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});

