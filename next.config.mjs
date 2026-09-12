import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Content Security Policy.
//
// script-src carries 'unsafe-inline' because the App Router emits inline
// bootstrap scripts (self.__next_f.push) on every page and there is no nonce
// pipeline here. That weakens the script half of the policy — honestly, it is
// the half that stops XSS — so this is not the finished article: the upgrade is
// to mint a nonce in proxy.js and thread it through. What it does buy today is
// everything else. No script origin but our own and the pinned SheetJS CDN, no
// <object>/<embed>, no framing, no form posting off-site, and no outbound
// connections beyond same-origin. The image-heavy modules (mood boards,
// attire) store arbitrary remote URLs, so img-src has to stay open to https:.
//
// No Google Fonts origins: next/font/google self-hosts the woff2 files into
// /_next/static/media at build time, so 'self' already covers them. Supabase is
// absent from connect-src for the same kind of reason — every call is
// server-side and the browser never talks to it directly.
//
// va.vercel-scripts.com is there because @vercel/speed-insights needs it.
// On Vercel it loads its script from a same-origin /_vercel path, which is why
// this looked unnecessary; anywhere else that path 404s and the package falls
// back to the vercel-scripts origin. Caught by a CSP violation in local dev.
const isDev = process.env.NODE_ENV !== "production";
const VERCEL_INSIGHTS = "https://va.vercel-scripts.com";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Turbopack's dev runtime needs eval and a websocket back to the dev server;
  // neither is in the deployed policy.
  `script-src 'self' 'unsafe-inline' https://cdn.sheetjs.com ${VERCEL_INSIGHTS}${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' ${VERCEL_INSIGHTS}${isDev ? " ws: wss:" : ""}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  reactStrictMode: true,
  // Pin the workspace root. A stray package-lock.json in the user's home dir
  // made Turbopack infer C:\Users\<user> as the root, so it resolved imports
  // against the wrong node_modules and tried to watch the whole profile —
  // dev died with MODULE_NOT_FOUND and then an OOM.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  // No outputFileTracingIncludes for the PDF fonts. It looked like it worked but
  // did nothing: Turbopack (the default builder here, and what Vercel runs)
  // ignores the option silently — a webpack build traced both .ttf files into
  // /api/pdf/[kind], a Turbopack build traced zero, and neither warned. The font
  // bytes are imported from lib/pdf/fonts.generated.js instead, so they are
  // bundled by any builder. Don't reintroduce this key expecting it to ship files.
  experimental: {
    // Client router cache: keep a visited tab's payload for 30s so switching
    // back is instant. In-app edits still appear immediately (server actions
    // call revalidatePath, which purges this cache); only edits from another
    // device can lag by up to 30s.
    staleTimes: { dynamic: 30 },
  },
};
export default nextConfig;
