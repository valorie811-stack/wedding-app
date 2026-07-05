import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Single-owner PIN gate. The PIN hash lives in the `app_settings` singleton row
// and is only ever touched by the service-role client on the server. In preview
// mode (no Supabase / service role) an optional APP_PIN env var is compared
// directly so the app can still be locked locally.

const PREVIEW_PIN = process.env.APP_PIN || null;
const PIN_RE = /^\d{4,8}$/;

function hash(pin, salt) {
  return scryptSync(String(pin), salt, 32).toString("hex");
}

export function isValidPinFormat(pin) {
  return PIN_RE.test(String(pin ?? ""));
}

// Has the owner set up a PIN yet? Drives setup-vs-unlock on the login screen.
export async function isPinConfigured() {
  const admin = createAdminClient();
  if (!admin) return Boolean(PREVIEW_PIN);
  const { data } = await admin
    .from("app_settings")
    .select("pin_hash")
    .eq("id", 1)
    .maybeSingle();
  return Boolean(data?.pin_hash);
}

// First-run setup. Refuses to overwrite an existing PIN (use changePin for that).
export async function setupPin(pin) {
  if (!isValidPinFormat(pin)) return { ok: false, error: "format" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "no-backend" };
  if (await isPinConfigured()) return { ok: false, error: "already-set" };
  const salt = randomBytes(16).toString("hex");
  const { error } = await admin.from("app_settings").upsert({
    id: 1,
    pin_hash: hash(pin, salt),
    pin_salt: salt,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function verifyPin(pin) {
  const admin = createAdminClient();
  if (!admin) return PREVIEW_PIN ? String(pin) === String(PREVIEW_PIN) : false;
  const { data } = await admin
    .from("app_settings")
    .select("pin_hash,pin_salt")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.pin_hash || !data?.pin_salt) return false;
  const a = Buffer.from(hash(pin, data.pin_salt), "hex");
  const b = Buffer.from(data.pin_hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Change the PIN — requires the current PIN to check out first.
export async function changePin(current, next) {
  if (!(await verifyPin(current))) return { ok: false, error: "wrong-current" };
  if (!isValidPinFormat(next)) return { ok: false, error: "format" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "no-backend" };
  const salt = randomBytes(16).toString("hex");
  const { error } = await admin
    .from("app_settings")
    .update({ pin_hash: hash(next, salt), pin_salt: salt, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
