// // src/middleware.ts
// import { getToken } from 'next-auth/jwt';
// import { NextRequest, NextResponse } from 'next/server';

// export async function middleware(req: NextRequest) {
//   const { pathname } = req.nextUrl;

//   // 1. Allow API Auth
//   if (pathname.startsWith('/api/auth')) {
//     return NextResponse.next();
//   }

//   // 2. Allow Receipt Pages (Bypass Login)
//   if (pathname.startsWith('/receipt')) {
//     return NextResponse.next();
//   }

//   // 3. Get User Token
//   const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
//   const isLoggedIn = !!token;
//   const isAdmin = token?.role === 'admin';

//   // DEBUG LOGGING
//   if (pathname !== '/_next/static' && !pathname.includes('.')) {
//     // console.log(`[Middleware] Path: ${pathname}, LoggedIn: ${isLoggedIn}, Phone: ${token?.phoneNumber}`);
//   }

//   // 4. Redirect logged-in users away from the Landing Page OR force verification
//   if (isLoggedIn) {
//     // If logged in but NOT verified and NOT admin, force verification
//     const hasPhone = token?.phoneNumber && String(token.phoneNumber).trim().length > 0;

//     // DEBUG: log the state
//     console.log(`[Middleware] User: ${token?.email}, Role: ${token?.role}, HasPhone: ${hasPhone}, Path: ${pathname}`);

//     if (!isAdmin && !hasPhone && pathname !== '/verify-phone') {
//       console.log(`[Middleware] Redirecting unverified user to /verify-phone. Path: ${pathname}`);
//       return NextResponse.redirect(new URL('/verify-phone', req.url));
//     }

//     // Redirect verified users away from landing/login pages
//     if (pathname === '/' || pathname === '/login') {
//       if (isAdmin) {
//         return NextResponse.redirect(new URL('/admin/dashboard', req.url));
//       }
//       return NextResponse.redirect(new URL('/dashboard', req.url));
//     }
//   }

//   // Define specific public paths that do NOT require Auth
//   const publicPaths = ['/', '/admin', '/logo.png', '/favicon.ico', '/login', '/assets'];

//   // Helper to check if path is public
//   const isPublic = (path: string) => {
//     return publicPaths.some(p => path === p || path.startsWith('/assets') || (path.startsWith('/admin') && !path.startsWith('/admin/dashboard')));
//   };

//   // 5. Protect Admin Routes (Explicit check)
//   if (pathname.startsWith('/admin/dashboard')) {
//     if (!isAdmin) return NextResponse.redirect(new URL('/dashboard', req.url));
//   }

//   // 6. Protect ALL other routes - "Deny by Default"
//   if (!isPublic(pathname) && pathname !== '/verify-phone') {
//     // A. Must be logged in
//     if (!isLoggedIn) {
//       const loginUrl = new URL('/login', req.url);
//       loginUrl.searchParams.set('callbackUrl', pathname);
//       console.log(`[Middleware] Redirecting unauth user to Login. Path: ${pathname}`);
//       return NextResponse.redirect(loginUrl);
//     }
//   }

//   // 7. Handle Subdomain/Tenant logic
//   const hostname = req.headers.get('host');
//   const subdomain = hostname?.includes('.') ? hostname.split('.')[0] : '';
//   const requestHeaders = new Headers(req.headers);
//   requestHeaders.set('x-tenant-id', subdomain);

//   return NextResponse.next({
//     request: {
//       headers: requestHeaders,
//     },
//   });
// }

// export const config = {
//   // ✅ FIXED: Added "|receipt" to the regex.
//   // This forces Next.js to SKIP middleware entirely for these paths.
//   matcher: [
//     '/((?!api|_next/static|_next/image|assets|images|favicon.ico|sw.js|push-sw.js|workbox-|manifest.json|receipt).*)',
//   ],
// };


// src/middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow API Auth & Receipts (Public access)
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/receipt')) {
    return NextResponse.next();
  }

  // 2. Get User Token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const isAdmin = token?.role === 'admin';

  // 3. Auth & Verification Logic
  if (isLoggedIn) {
    const hasPhone = token?.phoneNumber && String(token.phoneNumber).trim().length > 0;

    // Force phone verification for non-admins
    if (!isAdmin && !hasPhone && pathname !== '/verify-phone') {
      return NextResponse.redirect(new URL('/verify-phone', req.url));
    }

    // Redirect verified users away from landing/login pages
    if (pathname === '/' || pathname === '/login') {
      return NextResponse.redirect(new URL(isAdmin ? '/admin/dashboard' : '/dashboard', req.url));
    }

    /**
     * 4. FEATURE-BASED ACCESS CONTROL
     * Validates plan and features for every request
     */
    if (!isAdmin) {
      const plan = token.plan;
      const features = token.features || { productAI: false, serviceAI: false, customWhatsapp: false };

      // A. PRODUCT AI ACCESS
      if (pathname.startsWith('/api/ai-insights') || pathname.includes('/inventory/ai')) {
        if (!features.productAI) {
          return blockAccess(req, "Product AI requires a PRO feature upgrade.");
        }
      }

      // B. SERVICE AI ACCESS
      if (pathname.startsWith('/api/services/ai') || pathname.includes('/services/ai')) {
        if (!features.serviceAI) {
          return blockAccess(req, "Service AI requires a PRO feature upgrade.");
        }
      }

      // C. CUSTOM WHATSAPP ACCESS
      // Free users can use /api/whatsapp/send (Default), 
      // but are blocked from /settings/whatsapp or /api/whatsapp/settings
      if (pathname.startsWith('/api/whatsapp/settings') || pathname.startsWith('/settings/whatsapp')) {
        if (plan !== 'PRO' || !features.customWhatsapp) {
          return blockAccess(req, "Custom WhatsApp settings are reserved for PRO users.");
        }
      }
    }
  }

  // 5. Public Paths & Admin Protection
  const publicPaths = ['/', '/admin', '/logo.png', '/favicon.ico', '/login', '/assets'];
  const isPublic = (path: string) => {
    return publicPaths.some(p => path === p || path.startsWith('/assets') || (path.startsWith('/admin') && !path.startsWith('/admin/dashboard')));
  };

  if (pathname.startsWith('/admin/dashboard') && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isPublic(pathname) && pathname !== '/verify-phone' && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. Handle Subdomain/Tenant logic
  const hostname = req.headers.get('host');
  const subdomain = hostname?.includes('.') ? hostname.split('.')[0] : '';
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-id', subdomain);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

/**
 * Helper: Block access based on Request Type (API vs UI)
 */
function blockAccess(req: NextRequest, message: string) {
  // If it's an API request, return a 403 Forbidden JSON
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Feature Restricted', message },
      { status: 403 }
    );
  }
  // If it's a UI request, redirect to dashboard with error toast info
  const url = new URL('/dashboard', req.url);
  url.searchParams.set('error', 'upgrade_required');
  url.searchParams.set('message', message);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest, sw.js, etc)
     * - receipt (bypass logic)
     * 
     * NOTE: We REMOVED the "api" exclusion so that AI and WhatsApp APIs 
     * are correctly validated by the middleware.
     */
    '/((?!_next/static|_next/image|assets|images|favicon.ico|sw.js|push-sw.js|workbox-|manifest.json|receipt).*)',
  ],
};