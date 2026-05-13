import { NextResponse, type NextRequest } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

const PUBLIC_PREFIXES = ['/welcome'];
const PUBLIC_FILES = ['/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/welcome';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    PUBLIC_FILES.includes(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === '/api/auth/session' || pathname.startsWith('/api/auth/session/')) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);

  if (hasSession && pathname === '/welcome') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  for (const p of PUBLIC_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) {
      return NextResponse.next();
    }
  }

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/welcome';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
