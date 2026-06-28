export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A real Supabase project URL: https://<ref>.supabase.co
function isValidSupabaseUrl(url) {
  if (!url || url.includes("YOUR-PROJECT-ref")) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// True only when real credentials are present AND the URL is well-formed.
// A malformed URL (e.g. an API key pasted into the URL field) falls back to
// "preview" mode with local seed data instead of crashing the app.
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && isValidSupabaseUrl(SUPABASE_URL)
);

if (SUPABASE_URL && SUPABASE_ANON_KEY && !isValidSupabaseUrl(SUPABASE_URL)) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL is not a valid http(s) URL — " +
      "running in preview mode. Expected https://<project-ref>.supabase.co"
  );
}
