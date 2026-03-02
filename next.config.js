/** @type {import('next').NextConfig} */

const nextConfig = {
  output: process.env.DOCKER_ENV === 'true' ? 'standalone' : undefined,

  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Keep disabled by policy; do not enable optimization in this refactor track.
    unoptimized: true,
  },
  turbopack: {
    // In Turbopack, use resolveAlias as the equivalent of webpack resolve.fallback.
    resolveAlias: {
      net: {
        browser: './src/lib/empty-module.ts',
      },
      tls: {
        browser: './src/lib/empty-module.ts',
      },
      crypto: {
        browser: './src/lib/empty-module.ts',
      },
    },
  },
};

module.exports = nextConfig;
