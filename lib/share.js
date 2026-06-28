// Pure share helpers — safe to import from BOTH client and server (no Supabase
// imports here). Token formats:
//   • live mode  → opaque random token, stored in the `shares` table.
//   • preview    → self-encoding "p_" + base64url(JSON) so /share/[token] works
//                  with no database (decoded only when the service role isn't
//                  configured, so live deployments still honour revoke/expiry).

export const SHARE_RESOURCES = ["guests", "vendors", "schedule", "budget", "rsvp"];

// base64url that works in Node (Buffer) and the browser (btoa/atob).
function b64urlEncode(str) {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(str, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
  return decodeURIComponent(escape(atob(b64)));
}

// Opaque token for DB-backed shares.
export function makeRandomToken() {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return uuid.replace(/-/g, "");
}

// Self-encoding token for preview mode. payload: { r, s, exp, label, o }
export function encodePreviewToken({ resource, scope = "BOTH", expMs = null, label = "", otp = false }) {
  const payload = { r: resource, s: scope, exp: expMs, label, o: !!otp };
  return "p_" + b64urlEncode(JSON.stringify(payload));
}

export function decodePreviewToken(token) {
  if (typeof token !== "string" || !token.startsWith("p_")) return null;
  try {
    const obj = JSON.parse(b64urlDecode(token.slice(2)));
    if (!obj || !SHARE_RESOURCES.includes(obj.r)) return null;
    return obj;
  } catch {
    return null;
  }
}

// Build the absolute share URL on the client (origin known at runtime).
// `base` lets RSVP links point at the writable form route instead of /share.
export function buildShareUrl(token, base = "/share") {
  const origin =
    typeof window !== "undefined" && window.location ? window.location.origin : "";
  return `${origin}${base}/${token}`;
}

export const EXPIRY_CHOICES = [
  { key: "7", days: 7 },
  { key: "30", days: 30 },
  { key: "90", days: 90 },
  { key: "never", days: null },
];
