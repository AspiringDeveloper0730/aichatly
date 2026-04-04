import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' *",
          },
        ],
      },
      {
        source: '/:path*.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, no-cache' }],
      },
      {
        source: '/:path*.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      // Example: manifest.json
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
  },
  // images: {
  //   remotePatterns: [
  //     {
  //       hostname: "images.pexels.com",
  //     },
  //     {
  //       hostname: "images.unsplash.com",
  //     },
  //     {
  //       hostname: "chat2db-cdn.oss-us-west-1.aliyuncs.com",
  //     },
  //     {
  //       hostname: "cdn.chat2db-ai.com",
  //     }
  //   ],
  // },
};

export default nextConfig;
