import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-cookies';

type SessionBody = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
};

const secure = process.env.NODE_ENV === 'production';

export async function POST(request: Request) {
  let body: SessionBody;
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const access = body.accessToken?.trim();
  const refresh = body.refreshToken?.trim();
  if (!access || !refresh) {
    return NextResponse.json(
      { ok: false, error: 'accessToken and refreshToken required' },
      { status: 400 }
    );
  }
  const maxAge = Math.max(60, Number(body.expiresIn) || 3600);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_TOKEN_COOKIE, access, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge,
  });
  res.cookies.set(REFRESH_TOKEN_COOKIE, refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_TOKEN_COOKIE);
  res.cookies.delete(REFRESH_TOKEN_COOKIE);
  return res;
}
