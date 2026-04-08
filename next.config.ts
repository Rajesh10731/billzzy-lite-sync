import type { NextConfig } from "next";
import withPWA from "next-pwa";
import path from "path";

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
        ignored: [
          "**/public/sw.js",
          "**/public/workbox-*.js",
          "**/public/sw.js.map",
          "**/.next/**",
        ],
      };
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // @ts-expect-error - importScripts is not in NextConfig type but required for next-pwa
  importScripts: ['/push-sw.js'],
  // Fix for: bad-precaching-response with app-build-manifest.json
  buildExcludes: [/app-build-manifest\.json$/, /_buildManifest\.js$/, /_ssgManifest\.js$/],
});

export default pwaConfig(nextConfig);