import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  turbopack: {
    resolveAlias: {
      '@react-pdf/renderer': {
        browser: '@react-pdf/renderer',
        default: './src/lib/pdf-stub.ts',
      },
    },
  },
};

export default nextConfig;
