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
    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    const { username, password, role, storeId } = body ?? {};
    const ALLOWED_ROLES = ["admin", "supervisor", "inventory_man", "cashier"];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const errors: string[] = [];
    if (typeof username !== "string" || !/^[a-zA-Z0-9_.-]{3,50}$/.test(username.trim())) {
      errors.push("username must be 3-50 chars (letters, numbers, _ . -)");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      errors.push("password must be 8-128 characters");
    }
    if (typeof role !== "string" || !ALLOWED_ROLES.includes(role)) {
      errors.push(`role must be one of: ${ALLOWED_ROLES.join(", ")}`);
    }
    if (storeId !== undefined && storeId !== null && storeId !== "" && !(typeof storeId === "string" && UUID_RE.test(storeId))) {
      errors.push("storeId must be a valid UUID");
    }
    if (errors.length) {
      return new Response(JSON.stringify({ error: errors.join("; ") }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate email from username (internal use only)
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@internal.system`;

    // 1️⃣ Create the user in Supabase Auth
    console.log("Creating user in Supabase Auth...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, username },
    });

    if (error) {
      console.error("Auth error:", error);
      throw error;
    }

    console.log("User created in Auth, now adding role and profile...");
    
    // 2️⃣ Add a record in "user_roles" table
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.user?.id,
      role,
    });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      throw roleError;
    }

    // 3️⃣ Create user profile with username and store
    const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
      user_id: data.user?.id,
      username,
      store_id: storeId || null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw profileError;
    }

    console.log("User created successfully with profile!");
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

