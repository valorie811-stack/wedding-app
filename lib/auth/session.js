// Owner session token — a signed, expiring value stored in an httpOnly cookie.
// Uses the Web Crypto API only (crypto.subtle), so it runs in BOTH the Edge
// middleware/proxy runtime and the Node server-action runtime. No Node-only
// imports here — keep it Edge-safe.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_COOKIE = "wp_session";
export const SESSION_TTL_DAYS = 30;

function bytesToB64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// The HMAC secret. Set APP_SESSION_SECRET in production; the fallback is only
// meant for local/demo use and logs a warning once.
let warned = false;
export function getSessionSecret() {
  const s = process.env.APP_SESSION_SECRET;
  if (s) return s;
  if (!warned) {
    warned = true;
    console.warn(
      "[auth] APP_SESSION_SECRET is not set — using an insecure default. " +
        "Set APP_SESSION_SECRET before deploying."
    );
  }
  return "dev-insecure-secret-change-me";
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Produce `<payload>.<signature>` where payload encodes the expiry timestamp.
export async function signSession(secret, ttlMs = SESSION_TTL_DAYS * 86400000) {
  const exp = Date.now() + ttlMs;
  const payload = bytesToB64url(enc.encode(String(exp)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${bytesToB64url(sig)}`;
}

// Verify signature + expiry. Returns true when the token is valid and unexpired.
export async function verifySession(secret, token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), enc.encode(payload));
    if (!ok) return false;
    const exp = Number(dec.decode(b64urlToBytes(payload)));
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    return false;
  }
}
