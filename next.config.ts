import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Override webpack config for @xenova/transformers (when running without Turbopack)
  webpack: (config) => {
    config.resolve.alias = {
        ...config.resolve.alias,
        "sharp$": false,
        "onnxruntime-node$": false,
    }
    return config;
  },
  // Silence Turbopack warning
  turbopack: {}
};

export default nextConfig;
