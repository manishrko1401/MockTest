import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.14',
    '192.168.*',
    'localhost:3000',
    '127.0.0.1',
  ],
};

export default nextConfig;
