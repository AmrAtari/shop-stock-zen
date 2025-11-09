import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in your .env file");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // This setting helps prevent the "Multiple GoTrueClient instances detected" warning
    // by using a consistent storage key across your application.
    storageKey: "pos_app_storage_key",
    // Recommended for React apps to correctly handle session URLs
    detectSessionInUrl: true,
  },
});
