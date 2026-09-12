import "server-only";
import { cookies } from "next/headers";
import { verifySession, getSessionSecret, SESSION_COOKIE } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Defence in depth for server actions.
//
// proxy.js already redirects an unauthenticated request, and a server action is
// a POST to the page it came from, so today the gate does cover them. That is a
// single point of failure for every write in the app, and it is the thing most
// likely to be loosened by accident — a matcher exclusion added for an asset
// path, a route moved under a public prefix. Next's own guidance is not to let
// middleware be the only authorization layer, so each action checks too.
//
// Mirrors updateSession in lib/supabase/middleware.js exactly: with no backend
// and no APP_PIN the app is an open local demo and the gate is off, so actions
// must keep working there.
function gateEnabled() {
  return isSupabaseConfigured || Boolean(process.env.APP_PIN);
}

export async function hasOwnerSession() {
  if (!gateEnabled()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(getSessionSecret(), token);
}

// The shape every module action returns on refusal. Prose, matching the
// NO_WEDDING messages in the budget and vendor actions: the module views put
// `error` straight into the error banner's detail line. The settings form does
// its own `login.err.*` lookup and returns a key instead.
export const UNAUTHORIZED = {
  ok: false,
  error: "Your session has expired. Reload the page and unlock again.",
};
