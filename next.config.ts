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

/** Resolve ai.backend origin for `/files/*` rewrites (no trailing slash). */
function resolveBackendOriginForRewrites(): string {
  let origin = (() => {
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
  if (!origin) return '';
  // Never rewrite /files to the Next server itself (proxy loop + ENOBUFS / 500).
  try {
    const u = new URL(origin);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    const loopback =
      u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1';
    if (loopback && port === '3000') {
      console.warn(
        '[next.config] NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_GRAPHQL_URL must not target :3000 (Next). Using http://127.0.0.1:8000 for /files upstream.'
      );
      origin = 'http://127.0.0.1:8000';
    }
  } catch {
    /* keep origin string */
  }
  return origin;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  compress: true,
  poweredByHeader: false,
  devIndicators: false,
  /**
   * GraphQL `storageUpload` sends base64 in JSON; default proxy buffer is 10MB so ~8MB
   * binaries (~11MB JSON) were truncated → invalid JSON / HTTP 500. Keep headroom for
   * the UI max (20MB/file) plus JSON overhead.
   *
   * `proxyTimeout`: `/files/*` rewrites can serve large objects; default ~30s caused
   * ECONNRESET on slow downloads. Match Contact360 GraphQL proxy headroom (5m).
   */
  experimental: {
    proxyClientMaxBodySize: '48mb',
    proxyTimeout: 300_000,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  /**
   * Tree-shake lucide icons. Import names must match lucide exports (e.g. `Image as ImageIcon`,
   * not `ImageIcon` — kebabCase would resolve to non-existent `image-icon`).
   */
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
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
    const backendOrigin = resolveBackendOriginForRewrites();
    /** GraphQL: browser calls ai.backend directly (`getGraphqlHttpUrl`). Session cookies: `app/api/auth/session/route.ts`. */
    const filesDest = backendOrigin ? `${backendOrigin}/files/:path*` : '';
    return [
      fav,
      ...(filesDest
        ? [
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['react-motion'],
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
