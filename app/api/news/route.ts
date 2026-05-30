import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const category = searchParams.get('category');
  const refresh = searchParams.get('refresh') || 'false';

  if (!country || !category) {
    return NextResponse.json({ error: 'Missing country or category parameter' }, { status: 400 });
  }

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/news?country=${encodeURIComponent(country)}&category=${encodeURIComponent(category)}&refresh=${refresh}`,
      {
        method: 'GET',
        headers,
      }
    );

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
    console.error('[News Proxy Error]:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with the backend news API' },
      { status: 502 }
    );
  }
}
