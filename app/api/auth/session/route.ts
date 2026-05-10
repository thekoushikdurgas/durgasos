import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-cookies';

type SessionBody = {
  accessToken: string;
  refreshToken: string;
  /** Seconds until access token expiry (Supabase `expires_in`). */
  expiresIn?: number;
};

export async function POST(req: NextRequest) {
  let body: SessionBody;
  try {
    body = (await req.json()) as SessionBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json(
      { ok: false, error: 'accessToken and refreshToken required' },
      { status: 400 }
    );
  }

  const maxAge = Math.max(60, Math.floor(body.expiresIn ?? 3600));
  const isProd = process.env.NODE_ENV === 'production';
  const jar = await cookies();

  jar.set(ACCESS_TOKEN_COOKIE, body.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  jar.set(REFRESH_TOKEN_COOKIE, body.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
