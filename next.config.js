/**
 * The browser only ever talks to this Next.js app (same origin).
 * Next forwards /api/* and /uploads/* to your FastAPI backend, so you never hit CORS problems
 * and the same build works on localhost and on your server.
 * Set BACKEND_URL in .env.local (default: http://150.136.74.154:8001).
 */
const BACKEND = (process.env.BACKEND_URL || 'http://150.136.74.154:8001').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
