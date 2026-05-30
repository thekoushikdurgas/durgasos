import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') || 'false';

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  try {
    const res = await fetch(`${BACKEND_URL}/api/events?refresh=${refresh}`, {
      method: 'GET',
      headers,
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
    console.error('[Events Proxy Error]:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with the backend events API' },
      { status: 502 }
    );
  }
}
