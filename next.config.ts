import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  agentRules: false,
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
