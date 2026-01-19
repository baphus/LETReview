/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
