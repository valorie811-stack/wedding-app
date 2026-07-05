import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Single-owner app: every DB call is server-side and trusted (the whole app is
// gated by the owner PIN session), so we use the service-role key to bypass RLS.
// Falls back to the anon key when no service-role key is set (reads may then be
// limited by RLS) and to null when Supabase isn't configured at all — in which
// case callers fall back to local seed data (preview mode).
export async function createClient() {
  if (!isSupabaseConfigured) return null;
  const key = SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
