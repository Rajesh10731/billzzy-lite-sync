'use client';

import './globals.css';
import { ReactNode } from 'react';
import NextAuthSessionProvider from '@/components/SessionProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Billzzy Lite</title>
        <meta name="description" content="A lightweight billing PWA" />

        {/* Viewport that disables user scaling to prevent layout breaks on iOS while maintaining edge-to-edge support */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

        {/* --- PWA and Apple Tags --- */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5a4fcf" />

        {/* --- Tags for Apple devices --- */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Billzzy Lite" />
        <link rel="apple-touch-icon" href="/assets/pwa-app.png" />
        {/* Splash screen for iPhone 14/15 Pro Max example (ideally multiple sizes) */}
        <link rel="apple-touch-startup-image" href="/assets/pwa-app.png" />
      </head>

      <body className='bg-gray-50'>
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}