import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to handle a JSON response
function jsonResponse(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/|\/$/g, ""); // Get path without leading/trailing slashes

  try {
    // 1. Verify Caller Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "No authorization header" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Verify Caller Admin Role
    const { data: callerRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();

    if (callerRole?.role !== "admin") {
      return jsonResponse({ error: "Forbidden: Admin access required" }, 403);
    }

    // --- ROUTING ADMIN ACTIONS ---

    const body = req.method === "POST" || req.method === "PUT" ? await req.json() : {};

    // ----------------------------------------------------
    // A. List Users (Initial Path or explicit list)
    // ----------------------------------------------------
    if (path === "admin-list-users" || path === "functions/v1/admin-list-users" || req.method === "GET") {
      // Get all users from auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabaseAdmin.from("user_roles").select("*");
      if (rolesError) throw rolesError;

      // Combine user data with roles
      const users = authUsers.users.map((user) => {
        const userRole = userRoles?.find((r) => r.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          role: userRole?.role || null,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
        };
      });

      return jsonResponse({ users });
    }

    // ----------------------------------------------------
    // B. Create User with Password (admin-create-user-password)
    // ----------------------------------------------------
    if (path === "admin-create-user-password" || path === "functions/v1/admin-create-user-password") {
      const { userId: email, password, role } = body; // userId is passed as email
      if (!email || !password || !role) {
        return jsonResponse({ error: "Missing email, password, or role" }, 400);
      }

      // 1. Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Optional: auto-confirm the user
      });

      if (createError) throw createError;

      // 2. Insert role into user_roles table
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user?.id, role: role });

      if (roleError) {
        // If role insertion fails, try to delete the user to prevent a dangling account
        await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id!);
        throw roleError;
      }

      return jsonResponse({ message: `User ${email} created and role assigned.` });
    }

    // ----------------------------------------------------
    // C. Manage User Role (admin-manage-user-role)
    // ----------------------------------------------------
    if (path === "admin-manage-user-role" || path === "functions/v1/admin-manage-user-role") {
      const { userId, role, action } = body;
      if (!userId || !action) {
        return jsonResponse({ error: "Missing user ID or action" }, 400);
      }

      if (action === "update") {
        if (!role) {
          return jsonResponse({ error: "Missing new role for update action" }, 400);
        }

        // Upsert (update or insert) the user's role
        const { error: updateError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: role }, { onConflict: "user_id" });

        if (updateError) throw updateError;
        return jsonResponse({ message: `Role for user ${userId} updated to ${role}.` });
      } else if (action === "delete") {
        // Delete the user's role (effectively setting them to "no role")
        const { error: deleteError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

        if (deleteError) throw deleteError;
        return jsonResponse({ message: `Role for user ${userId} deleted.` });
      } else {
        return jsonResponse({ error: "Invalid action specified" }, 400);
      }
    }

    // Fallback if path is not recognized
    return jsonResponse({ error: "Not Found" }, 404);
  } catch (err: any) {
    console.error("Function Error:", err.message);
    return jsonResponse({ error: err.message }, 500);
  }
});
