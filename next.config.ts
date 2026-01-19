
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
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://letreview.firebaseapp.com/__/auth/:path*',
      },
       {
        source: '/__/firebase/:path*',
        destination: 'https://letreview.firebaseapp.com/__/firebase/:path*',
      },
    ];
  },
};

export default nextConfig;
