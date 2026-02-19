import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    // 1. Add Cloudinary here (Required for the Image component to work with uploads)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'your-netlify-site.netlify.app',
      },
    ],
  },

  // Environment variables handling
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: /public\/(sw\.js|workbox-.*\.js|sw\.js\.map)/,
      };
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: "public",
  disable: false, // Re-enabled for testing push
  register: true,
  skipWaiting: true,
  // @ts-ignore - importScripts is supported by next-pwa but might not be in the type definition used
  importScripts: ['/push-sw.js'],
});

export default pwaConfig(nextConfig);