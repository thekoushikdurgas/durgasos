import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_DEV_GRAPHQL = 'http://127.0.0.1:8000/graphql';

function backendGraphqlUrl(): string | null {
  const explicit =
    process.env.BACKEND_GRAPHQL_URL || process.env.NEXT_PUBLIC_GRAPHQL_URL || null;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === 'development') {
    return DEFAULT_DEV_GRAPHQL;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const target = backendGraphqlUrl();
  if (!target) {
    return NextResponse.json(
      {
        errors: [
          {
            message:
              'Set BACKEND_GRAPHQL_URL or NEXT_PUBLIC_GRAPHQL_URL (see durgasos/.env.example).',
          },
        ],
      },
      { status: 503 }
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
