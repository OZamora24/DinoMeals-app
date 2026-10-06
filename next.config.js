/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/apple-touch-icon.png', destination: '/icon-192.png' }];
  },
};
