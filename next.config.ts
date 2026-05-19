import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  /**
   * GraphQL `storageUpload` sends base64 in JSON; default proxy buffer is 10MB so ~8MB
   * binaries (~11MB JSON) were truncated → invalid JSON / HTTP 500. Keep headroom for
   * the UI max (20MB/file) plus JSON overhead.
   */
  experimental: {
    proxyClientMaxBodySize: '48mb',
  },
  /** Firebase `signInWithPopup` needs this; default strict COOP blocks `window.closed` on the OAuth popup. */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
      },
    ];
  },
  async redirects() {
    return [{ source: '/auth', destination: '/', permanent: true }];
  },
  async rewrites() {
    const fav = { source: '/favicon.ico', destination: '/favicon.svg' };
    const backendOrigin = (() => {
      const b = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '').trim();
      if (b) return b;
      const gql = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
      if (gql) {
        try {
          return new URL(gql).origin;
        } catch {
          return '';
        }
      }
      if (process.env.NODE_ENV === 'development') return 'http://localhost:8000';
      return '';
    })();
    const graphqlDest = backendOrigin ? `${backendOrigin}/graphql` : '';
    const sessionDest = backendOrigin ? `${backendOrigin}/api/auth/session` : '';
    const filesDest = backendOrigin ? `${backendOrigin}/files/:path*` : '';
    return [
      fav,
      ...(graphqlDest && sessionDest && filesDest
        ? [
            { source: '/graphql', destination: graphqlDest },
            { source: '/api/auth/session', destination: sessionDest },
            /** Same-origin signed URLs (`storageSignedHttpUrl`); ai.backend serves bytes under STORAGE_URL_PREFIX (default `/files`). */
            { source: '/files/:path*', destination: filesDest },
          ]
        : []),
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  /** Next 16 defaults to Turbopack; empty config acknowledges intent alongside `webpack` (e.g. PWA / dev HMR hooks). */
  turbopack: {},
  webpack: (config, { dev }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default withPWA(nextConfig);
