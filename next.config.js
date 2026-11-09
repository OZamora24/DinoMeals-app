/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Easy-to-say review link (English and Spanish): dinomeals.app/review or /reviews sends people to the
  // Google review box. Temporary (307) so the destination can change later without browsers caching it.
  async redirects() {
    const GOOGLE_REVIEW = 'https://g.page/r/CQ0jG7Hsr86ZECE/review';
    return ['/review', '/reviews'].map((source) => ({ source, destination: GOOGLE_REVIEW, permanent: false }));
  },
  async rewrites() {
    return [{ source: '/apple-touch-icon.png', destination: '/icon-192.png' }];
  },
};
