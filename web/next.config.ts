import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@prisma/client', 'pg'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
