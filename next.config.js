/** @type {import('next').NextConfig} */

const nextConfig = {
  output: process.env.DOCKER_ENV === 'true' ? 'standalone' : undefined,

  reactStrictMode: false,

  // Uncoment to add domain whitelist
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
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
