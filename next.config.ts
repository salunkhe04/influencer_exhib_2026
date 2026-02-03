import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // destination:  "http://localhost:8082/:path*", // Proxy to Express API
        destination: "https://api.evhomes.tech/:path*", // Proxy to Express API
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.evhomes.tech",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "cdn.evhomes.tech",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "evhomes.tech", // ✅ Add this
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
