"use server";

import { changePin } from "@/lib/auth/pin";

// Change the owner PIN. Requires the current PIN to verify first.
export async function changePinAction(_prev, formData) {
  const current = formData.get("current");
  const next = formData.get("next");
  const confirm = formData.get("confirm");
  if (next !== confirm) return { error: "mismatch" };
  const res = await changePin(current, next);
  if (!res.ok) return { error: res.error };
  return { ok: true };
}
