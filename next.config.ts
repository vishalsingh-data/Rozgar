import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable the Next.js dev overlay — it conflicts with React DevTools
  // browser extension in Next.js 15, causing 'l.nodeName.toLowerCase'
  // spam errors. Has zero effect on production builds.
  devIndicators: false,
};

export default nextConfig;
