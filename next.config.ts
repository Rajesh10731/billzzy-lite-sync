import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone mode for better deployment compatibility
  output: 'standalone',

  // Handle images properly for all environments
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
  },
};

const pwaConfig = withPWA({
  dest: "public",
  disable: false,
  register: true,
  skipWaiting: true,
  // @ts-ignore - importScripts is supported by next-pwa but might not be in the type definition used
  importScripts: ['/push-sw.js'],
});

export default pwaConfig(nextConfig);