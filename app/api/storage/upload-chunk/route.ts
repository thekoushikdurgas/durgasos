import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

type StreamingRequestInit = RequestInit & { duplex?: 'half' };

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');

  const headers = new Headers();
  if (auth) headers.set('authorization', auth);
  if (contentType) headers.set('content-type', contentType);

  try {
    const body = request.body;

    const init: StreamingRequestInit = {
      method: 'POST',
      headers,
      body,
      duplex: 'half',
    };
    const res = await fetch(`${BACKEND_BASE}/files/upload/chunk`, init);

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[Upload Chunk Proxy Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 502 });
  }
}
