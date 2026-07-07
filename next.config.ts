import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Override webpack config for @xenova/transformers (when running without Turbopack or during build)
  webpack: (config) => {
    config.resolve.alias = {
        ...config.resolve.alias,
        "sharp$": false,
        "onnxruntime-node$": false,
    }
    return config;
  },
  // Silence Turbopack warning about having a webpack config without a turbopack config
  turbopack: {}
};

export default nextConfig;
