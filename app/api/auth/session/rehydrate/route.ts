import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-cookies';
import { refreshSessionViaGraphql } from '@/lib/refresh-session-graphql';

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

/** Re-issue JWT pair for the browser when httpOnly cookies exist but localStorage was cleared. */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value?.trim();
  if (!refreshToken) {
    return NextResponse.json({ ok: false, error: 'No refresh session' }, { status: 401 });
  }

  let rotated;
  try {
    rotated = await refreshSessionViaGraphql(refreshToken);
  } catch {
    return NextResponse.json({ ok: false, error: 'Auth backend unreachable' }, { status: 503 });
  }
  if (!rotated) {
    return NextResponse.json({ ok: false, error: 'Refresh failed' }, { status: 401 });
  }

  const maxAge = Math.max(60, typeof rotated.expiresIn === 'number' ? rotated.expiresIn : 3600);
  const res = NextResponse.json({
    ok: true,
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    expiresIn: rotated.expiresIn ?? null,
  });
  res.cookies.set(ACCESS_TOKEN_COOKIE, rotated.accessToken, cookieOptions(maxAge));
  res.cookies.set(REFRESH_TOKEN_COOKIE, rotated.refreshToken, cookieOptions(60 * 60 * 24 * 30));
  return res;
}
