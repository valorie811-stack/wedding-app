"use server";

import { changePin } from "@/lib/auth/pin";
import { hasOwnerSession } from "@/lib/auth/guard";

// Change the owner PIN. Requires an unlocked session AND the current PIN.
export async function changePinAction(_prev, formData) {
  // Returns a `login.err.*` key rather than the prose UNAUTHORIZED the module
  // actions use, because this form renders its error through a key lookup.
  if (!(await hasOwnerSession())) return { error: "unauthorized" };
  const current = formData.get("current");
  const next = formData.get("next");
  const confirm = formData.get("confirm");
  if (next !== confirm) return { error: "mismatch" };
  const res = await changePin(current, next);
  if (!res.ok) return { error: res.error };
  return { ok: true };
}
