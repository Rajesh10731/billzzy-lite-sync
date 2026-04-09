import { getToken, JWT } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

function handleAuthVerification(token: JWT | null, pathname: string, req: NextRequest) {
  const isAdmin = token?.role === 'admin';
  const hasPhone = token?.phoneNumber && String(token.phoneNumber).trim().length > 0;

  // Force phone verification for non-admins
  if (!isAdmin && !hasPhone && pathname !== '/verify-phone') {
    return NextResponse.redirect(new URL('/verify-phone', req.url));
  }

  // Redirect verified users away from landing/login pages
  if (pathname === '/' || pathname === '/login') {
    return NextResponse.redirect(new URL(isAdmin ? '/admin/dashboard' : '/dashboard', req.url));
  }

  return null;
}

/**
 * Helper: Enforce plan-based and feature-flag-based access
 */
function handleFeatureAccess(token: JWT | null, pathname: string, req: NextRequest) {
  if (token?.role === 'admin') return null;

  const features = token?.features || { productAI: false, serviceAI: false, customWhatsapp: false };

      // A. PRODUCT AI ACCESS
      if (pathname.startsWith('/api/ai-insights') || pathname.includes('/inventory/ai')) {
        if (!features.productAI) {
          return blockAccess(req, "Product AI requires a PRO feature upgrade.");
        }
      }

  // B. SERVICE AI ACCESS
  if (pathname.startsWith('/api/services/ai') || pathname.includes('/services/ai')) {
    if (!features.serviceAI) return blockAccess(req, "Service AI requires a PRO feature upgrade.");
  }

  // C. CUSTOM WHATSAPP ACCESS
  if (pathname.startsWith('/api/whatsapp/settings') || pathname.startsWith('/settings/whatsapp')) {
    if (token?.plan !== 'PRO' || !features.customWhatsapp) {
      return blockAccess(req, "Custom WhatsApp settings are reserved for PRO users.");
    }
  }

  return null;
}

/**
 * Helper: General route protection and public path logic
 */
function handleGlobalProtection(isLoggedIn: boolean, isAdmin: boolean, pathname: string, req: NextRequest) {
  const publicPaths = ['/', '/admin', '/logo.png', '/favicon.ico', '/login', '/assets'];
  const isPublic = publicPaths.some(p =>
    pathname === p || pathname.startsWith('/assets') || (pathname.startsWith('/admin') && !pathname.startsWith('/admin/dashboard'))
  );

  if (pathname.startsWith('/admin/dashboard') && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isPublic && pathname !== '/verify-phone' && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow API Auth & Receipts (Public access)
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/receipt')||pathname.startsWith('/api/external')) {
    return NextResponse.next();
  }

  // 2. Get User Token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const isAdmin = token?.role === 'admin';

  // 3. Auth & Verification Logic
  if (isLoggedIn) {
    const verificationRedirect = handleAuthVerification(token, pathname, req);
    if (verificationRedirect) return verificationRedirect;

    const featureBlock = handleFeatureAccess(token, pathname, req);
    if (featureBlock) return featureBlock;
  }

  // 4. Global Protection (Public lists, Admin block, Auth requirement)
  const protectionRedirect = handleGlobalProtection(isLoggedIn, isAdmin, pathname, req);
  if (protectionRedirect) return protectionRedirect;

  // 5. Handle Subdomain/Tenant logic
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