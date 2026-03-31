import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable source maps in production to prevent exposing source code
  productionBrowserSourceMaps: false,

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes except widget endpoints
        source: "/((?!api/agents/widget).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        // Widget routes: allow framing (embedded in third-party sites) but keep other headers
        source: "/api/agents/widget/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
