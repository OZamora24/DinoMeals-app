/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/apple-touch-icon.png', destination: '/icon-192.png' }];
  },
};
