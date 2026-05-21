import { NextResponse, type NextRequest } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

const PUBLIC_FILES = ['/favicon.ico'];

function sessionOptionalPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/api/auth/session';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  /** PWA / install assets and icons must not be session-gated (browser fetches manifest without cookies first). */
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    PUBLIC_FILES.includes(pathname) ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/')
  ) {
    return NextResponse.next();
  }

  /** Signed storage reads (rewritten to ai.backend); auth is `?token=`, not the session cookie. */
  if (pathname.startsWith('/files/')) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);

  /** Legacy welcome route removed — send users to the desktop shell + welcome modal. */
  if (pathname === '/welcome' || pathname.startsWith('/welcome/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!hasSession) {
    if (sessionOptionalPath(pathname)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
