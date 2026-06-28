import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing route. Exchanges the code for a session, links any
// pending invite to a member row, then redirects into the app.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(`${origin}/login`);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    // Link any pending invitation to a member row. The role is decided
    // server-side inside accept_invite() (SECURITY DEFINER) — the client
    // never gets to choose it. The first user is made owner by a DB trigger.
    await supabase.rpc("accept_invite");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
