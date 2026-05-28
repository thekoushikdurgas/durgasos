/// <reference types="vitest/globals" />
import { NextRequest } from 'next/server';

import { proxy } from './proxy';

function makeRequest(pathname: string, withSession = false): NextRequest {
  const url = new URL(`http://localhost:3000${pathname}`);
  const req = new NextRequest(url);
  if (withSession) {
    req.cookies.set('durgas_sb_access', 'test-access');
  }
  return req;
}

describe('proxy session gate', () => {
  it('allows /api/graphql without session cookie (welcome auth)', () => {
    const res = proxy(makeRequest('/api/graphql'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /api/auth/session/rehydrate without access cookie', () => {
    const res = proxy(makeRequest('/api/auth/session/rehydrate'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects protected API routes when unauthenticated', () => {
    const res = proxy(makeRequest('/api/storage/upload-init'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/$/);
  });

  it('allows protected API routes with session cookie', () => {
    const res = proxy(makeRequest('/api/storage/upload-init', true));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
