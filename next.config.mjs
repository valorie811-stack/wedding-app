import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
