import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured } from "./config";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// True when the service-role key is present alongside a valid project URL.
export const isAdminConfigured = Boolean(isSupabaseConfigured && SERVICE_ROLE_KEY);

// Service-role client — bypasses RLS. SERVER-ONLY. Never import into a client
// component. Used by the public /share/[token] route to read shared data
// without an authenticated session. Returns null when not configured.
export function createAdminClient() {
  if (!isAdminConfigured) return null;
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
