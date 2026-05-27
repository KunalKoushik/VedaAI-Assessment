/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://vedaai-backend-8419.onrender.com/api/:path*'
      }
    ];
  }
};
module.exports = nextConfig;