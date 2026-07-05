/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Client router cache: keep a visited tab's payload for 30s so switching
    // back is instant. In-app edits still appear immediately (server actions
    // call revalidatePath, which purges this cache); only edits from another
    // device can lag by up to 30s.
    staleTimes: { dynamic: 30 },
  },
};
export default nextConfig;
