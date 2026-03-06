// src/middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow API Auth
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 2. Allow Receipt Pages (Bypass Login)
  if (pathname.startsWith('/receipt')) {
    return NextResponse.next();
  }

  // 3. Get User Token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const isAdmin = token?.role === 'admin';

  // DEBUG LOGGING
  if (pathname !== '/_next/static' && !pathname.includes('.')) {
    // console.log(`[Middleware] Path: ${pathname}, LoggedIn: ${isLoggedIn}, Phone: ${token?.phoneNumber}`);
  }

  // Define route categories
  const adminRoutes = ['/admin/dashboard'];

  // 4. Redirect logged-in users away from the Landing Page OR force verification
  if (isLoggedIn) {
    // If logged in but NOT verified and NOT admin, force verification
    // This MUST check for null, undefined, and empty string
    const hasPhone = token?.phoneNumber && token.phoneNumber.trim().length > 0;

    if (!isAdmin && !hasPhone && pathname !== '/verify-phone') {
      console.log(`[Middleware] Redirecting unverified user to /verify-phone. Path: ${pathname}`);
      return NextResponse.redirect(new URL('/verify-phone', req.url));
    }

    // Redirect verified users away from landing/login pages
    if (pathname === '/' || pathname === '/login') {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Define specific public paths that do NOT require Auth
  const publicPaths = ['/', '/admin', '/logo.png', '/favicon.ico', '/login', '/assets'];

  // Helper to check if path is public
  const isPublic = (path: string) => {
    return publicPaths.some(p => path === p || path.startsWith('/assets') || (path.startsWith('/admin') && !path.startsWith('/admin/dashboard')));
  };

  // 5. Protect Admin Routes (Explicit check)
  if (pathname.startsWith('/admin/dashboard')) {
    if (!isAdmin) return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 6. Protect ALL other routes - "Deny by Default"
  if (!isPublic(pathname) && pathname !== '/verify-phone') {
    // A. Must be logged in
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      console.log(`[Middleware] Redirecting unauth user to Login. Path: ${pathname}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 7. Handle Subdomain/Tenant logic
  const hostname = req.headers.get('host');
  const subdomain = hostname?.includes('.') ? hostname.split('.')[0] : '';
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-id', subdomain);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // ✅ FIXED: Added "|receipt" to the regex.
  // This forces Next.js to SKIP middleware entirely for these paths.
  matcher: [
    '/((?!api|_next/static|_next/image|assets|images|favicon.ico|sw.js|push-sw.js|workbox-|manifest.json|receipt).*)',
  ],
};