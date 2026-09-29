/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cbdxebzizvgzoupdplvs.supabase.co",
      },
    ],
  },
  // NFR-03: browsers only honour HSTS over HTTPS, so this is inert on http://localhost.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }],
      },
    ];
  },
};

export default nextConfig;
