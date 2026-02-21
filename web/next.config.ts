import type { NextConfig } from "next";
// @ts-ignore - no types for next-pwa
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    outputFileTracingRoot: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
  },
};

export default pwaConfig(nextConfig);
