"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  setupPin,
  verifyPin,
  pinLockoutRemaining,
  recordPinFailure,
  clearPinFailures,
} from "@/lib/auth/pin";
import {
  signSession,
  getSessionSecret,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
} from "@/lib/auth/session";

async function startSession() {
  const token = await signSession(getSessionSecret(), SESSION_TTL_DAYS * 86400000);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

// Who is knocking, for throttling purposes. On Vercel the leftmost
// X-Forwarded-For entry is set by the platform; elsewhere the header is
// client-controlled, which is why the lockout map is size-bounded.
async function clientKey() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

// Unlock with an existing PIN.
export async function verifyPinAction(_prev, formData) {
  const key = await clientKey();
  // Check before verifying, so a locked-out caller cannot keep probing.
  if (pinLockoutRemaining(key) > 0) return { error: "locked" };

  const pin = formData.get("pin");
  const ok = await verifyPin(pin);
  if (!ok) {
    recordPinFailure(key);
    // Re-read: this failure may have been the one that tripped the lockout,
    // and saying so now is more use than another "incorrect PIN".
    return { error: pinLockoutRemaining(key) > 0 ? "locked" : "invalid" };
  }
  clearPinFailures(key);
  await startSession();
  redirect("/dashboard");
}

// First-run: set the PIN, then sign in.
export async function setupPinAction(_prev, formData) {
  const pin = formData.get("pin");
  const confirm = formData.get("confirm");
  if (pin !== confirm) return { error: "mismatch" };
  const res = await setupPin(pin);
  if (!res.ok) return { error: res.error };
  await startSession();
  redirect("/dashboard");
}

export async function signOutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
