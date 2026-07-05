"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setupPin, verifyPin } from "@/lib/auth/pin";
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

// Unlock with an existing PIN.
export async function verifyPinAction(_prev, formData) {
  const pin = formData.get("pin");
  const ok = await verifyPin(pin);
  if (!ok) return { error: "invalid" };
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
