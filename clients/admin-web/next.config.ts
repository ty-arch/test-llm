import type { NextConfig } from "next";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.ADMIN_API_PORT ?? 4002}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_API_BASE_URL: API_BASE_URL },
};

export default nextConfig;
