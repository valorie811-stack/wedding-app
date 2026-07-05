import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "./config";
import { verifySession, getSessionSecret, SESSION_COOKIE } from "@/lib/auth/session";

// Paths reachable without an owner session: the lock screen, PWA/offline assets,
// and the cron API routes (which guard themselves with CRON_SECRET).
const PUBLIC_PREFIXES = [
  "/login",
  "/offline",
  "/manifest",
  "/sw.js",
  "/icon",
  "/api/digest",
  "/api/reminders",
];

// Guards the app behind the single-owner PIN session cookie.
export async function updateSession(request) {
  const { pathname } = request.nextUrl;

  // Demo/preview: no backend and no PIN configured — let everything through so
  // the app is usable locally without any setup.
  const gateEnabled = isSupabaseConfigured || Boolean(process.env.APP_PIN);
  if (!gateEnabled) return NextResponse.next();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verifySession(getSessionSecret(), token) : false;

  // Not unlocked and trying to reach a protected page -> lock screen.
  if (!valid && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already unlocked but on the lock screen -> dashboard.
  if (valid && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
