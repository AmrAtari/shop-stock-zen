// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in your .env file");
}

let supabaseInstance;

if (!window.__supabaseClient) {
  window.__supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: "pos_app_storage_key",
      detectSessionInUrl: true,
    },
  });
}
supabaseInstance = window.__supabaseClient;

export const supabase = supabaseInstance;
