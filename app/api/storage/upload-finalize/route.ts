import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const headers = new Headers();
  if (auth) headers.set('authorization', auth);
  headers.set('content-type', 'application/json');

  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND_BASE}/files/upload/finalize`, {
      method: 'POST',
      headers,
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[Upload Finalize Proxy Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 502 });
  }
}
