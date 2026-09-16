import type { NextConfig } from "next";

const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = basePathEnv !== undefined
  ? (basePathEnv === '' || basePathEnv === '/' ? undefined : basePathEnv)
  : '/zensend';

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
