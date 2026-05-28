import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  const headers = new Headers();

  // Forward authorization and content-type headers
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND_URL}/api/places`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.text();
    const responseHeaders = new Headers();

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-type') {
        responseHeaders.append(key, value);
      }
    });

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Places Proxy Error]:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with the backend places API' },
      { status: 502 }
    );
  }
}
