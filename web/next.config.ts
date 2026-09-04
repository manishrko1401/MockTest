import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // PERF: Enable gzip compression on all server responses.
  // Typically reduces JSON payloads by 70-80% (e.g. 600KB → ~100KB).
  compress: true,

  // Remove the X-Powered-By header to reduce response size + avoid fingerprinting.
  poweredByHeader: false,

  allowedDevOrigins: [
    '192.168.1.14',
    '192.168.*',
    'localhost:3000',
    '127.0.0.1',
  ],
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },

  // PERF: Cache optimized images for 24 hours and serve WebP/AVIF formats.
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },

  async rewrites() {
    return [
      {
        source: '/exams.php',
        destination: '/typing-test',
      },
      {
        source: '/exams',
        destination: '/typing-test',
      },
      {
        source: '/exam/:slug([a-zA-Z0-9_-]*typing[a-zA-Z0-9_-]*)',
        destination: '/typing-test/category/:slug',
      },
      {
        source: '/exam/quick-brown-fox',
        destination: '/typing-test/category/quick-brown-fox',
      }
    ];
  },
};

export default nextConfig;
