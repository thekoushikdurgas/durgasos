import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-cookies';

function cookieOptions(maxAge: number) {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/** Same-origin session probe (replaces dev rewrite to ai.backend for cookie reads). */
export async function GET(request: NextRequest) {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  return NextResponse.json({ authenticated: Boolean(access) });
}

/** Persist httpOnly session cookies on the Next origin so WelcomeModal can dismiss. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const raw = body as { accessToken?: string; refreshToken?: string; expiresIn?: number | null };
  const accessToken = String(raw.accessToken ?? '').trim();
  const refreshToken = String(raw.refreshToken ?? '').trim();
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { ok: false, error: 'accessToken and refreshToken required' },
      { status: 400 }
    );
  }
  const maxAge = Math.max(60, typeof raw.expiresIn === 'number' ? raw.expiresIn : 3600);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(maxAge));
  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(60 * 60 * 24 * 30));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_TOKEN_COOKIE);
  res.cookies.delete(REFRESH_TOKEN_COOKIE);
  return res;
}
