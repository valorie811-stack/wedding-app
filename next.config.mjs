/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The PDF route reads bundled TTFs at runtime (lib/pdf/fonts). Next's file
  // tracing can't detect the dynamic fs.readFileSync, so force-include them in
  // the /api/pdf/[kind] serverless function; otherwise fonts are missing on Vercel.
  outputFileTracingIncludes: {
    "/api/pdf/[kind]": ["./lib/pdf/fonts/*.ttf"],
  },
  experimental: {
    // Client router cache: keep a visited tab's payload for 30s so switching
    // back is instant. In-app edits still appear immediately (server actions
    // call revalidatePath, which purges this cache); only edits from another
    // device can lag by up to 30s.
    staleTimes: { dynamic: 30 },
  },
};
export default nextConfig;
