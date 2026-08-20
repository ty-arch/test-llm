import path from "node:path";
import type { NextConfig } from "next";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.CHAT_API_PORT ?? 4001}`;

const nextConfig: NextConfig = {
  transpilePackages: ["@autix/contracts"],
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  env: {
    NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
