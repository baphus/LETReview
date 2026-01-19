
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/__/:path*',
          destination: 'https://letreview.firebaseapp.com/__/:path*',
        },
      ],
    };
  },
};

export default nextConfig;

    