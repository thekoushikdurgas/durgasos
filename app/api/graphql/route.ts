import { NextRequest, NextResponse } from 'next/server';

const BACKEND_GQL_URL = process.env.BACKEND_GRAPHQL_URL || 'http://127.0.0.1:8000/graphql';

export async function POST(request: NextRequest) {
  const headers = new Headers();

  // Forward authorization and content-type headers
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  // Forward cookie header if present
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  try {
    const body = await request.text();
    const res = await fetch(BACKEND_GQL_URL, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.text();
    const responseHeaders = new Headers();

    // Copy headers from backend response (e.g. Set-Cookie)
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie' || key.toLowerCase() === 'content-type') {
        responseHeaders.append(key, value);
      }
    });

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[GraphQL Proxy Error]:', error);
    return NextResponse.json(
      { errors: [{ message: 'Failed to communicate with the backend' }] },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET queries if any
  const { searchParams } = new URL(request.url);
  const backendUrl = new URL(BACKEND_GQL_URL);
  searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  try {
    const res = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    const data = await res.text();
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie' || key.toLowerCase() === 'content-type') {
        responseHeaders.append(key, value);
      }
    });

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[GraphQL Proxy GET Error]:', error);
    return NextResponse.json(
      { errors: [{ message: 'Failed to communicate with the backend' }] },
      { status: 502 }
    );
  }
}
