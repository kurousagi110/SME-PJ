import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone", // needed for Docker multi-stage build
  poweredByHeader: false,
  async rewrites() {
    // When deploying to Vercel without Nginx, rewrite /api/v1 calls to the remote backend
    const backendUrl = process.env.API_INTERNAL_URL;
    if (backendUrl && backendUrl.startsWith("http") && !backendUrl.includes("api:5000")) {
      const targetBase = backendUrl.replace(/\/+$/, "");
      return [
        {
          source: "/api/v1/:path*",
          destination: `${targetBase}/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
