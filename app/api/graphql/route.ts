import { NextRequest, NextResponse } from 'next/server';

function backendGraphqlUrl(): string | null {
  return process.env.BACKEND_GRAPHQL_URL || process.env.NEXT_PUBLIC_GRAPHQL_URL || null;
}

export async function POST(req: NextRequest) {
  const target = backendGraphqlUrl();
  if (!target) {
    return NextResponse.json(
      { errors: [{ message: 'BACKEND_GRAPHQL_URL or NEXT_PUBLIC_GRAPHQL_URL is not set' }] },
      { status: 500 }
    );
  }

  const body = await req.text();
  const token = req.cookies.get('durgas_sb_access')?.value;

  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(target, {
    method: 'POST',
    headers,
    body,
  });

  const out = await res.text();
  const ct = res.headers.get('content-type') || 'application/json';
  return new NextResponse(out, {
    status: res.status,
    headers: { 'Content-Type': ct },
  });
}
