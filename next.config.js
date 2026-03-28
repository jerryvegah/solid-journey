/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'agricheck.farm',
      },
      {
        protocol: 'https',
        hostname: 'www.agricheck.farm',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/satellite/:path*',
          destination: 'http://localhost:5000/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;