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

// ============================================================================
// Unlock throttling
//
// A 4-digit PIN is 10,000 guesses and verifyPin has no cost of its own worth
// speaking of, so the gate needs one. Five wrong PINs from an address buys a
// 15-minute lockout, which turns a sweep of the whole keyspace from minutes
// into years.
//
// State is per server instance and in memory. On Vercel that means an attacker
// who lands on a fresh lambda gets a fresh allowance, and a redeploy clears
// every record — this is not a distributed rate limiter. It is the amount of
// friction that can be added without a dependency or a database round-trip on
// the hot path, and it is the difference between "brute-forceable over lunch"
// and "not worth attempting". A shared counter belongs in app_settings if this
// ever needs to be airtight.
// ============================================================================

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
// Bound the map so a spray of forged X-Forwarded-For values cannot grow it
// without limit. Pruning expired entries first keeps live lockouts intact.
const MAX_TRACKED = 1000;

const failures = new Map(); // key -> { n, until }

function prune(now) {
  for (const [k, rec] of failures) {
    if (!rec.until || rec.until <= now) failures.delete(k);
  }
  if (failures.size > MAX_TRACKED) failures.clear();
}

// Milliseconds still to wait before this key may try again (0 when it may).
export function pinLockoutRemaining(key) {
  const rec = failures.get(key);
  if (!rec?.until) return 0;
  const left = rec.until - Date.now();
  if (left <= 0) {
    failures.delete(key);
    return 0;
  }
  return left;
}

export function recordPinFailure(key) {
  const now = Date.now();
  if (failures.size >= MAX_TRACKED) prune(now);
  const rec = failures.get(key) || { n: 0, until: 0 };
  rec.n += 1;
  if (rec.n >= MAX_ATTEMPTS) {
    rec.until = now + LOCKOUT_MS;
    rec.n = 0;
  }
  failures.set(key, rec);
}

export function clearPinFailures(key) {
  failures.delete(key);
}
