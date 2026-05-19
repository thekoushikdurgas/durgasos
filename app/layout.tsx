import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles
import { AppProviders } from '@/components/AppProviders';
import { GlassFilter } from '@/components/ui/liquid-glass';
import { ApolloGraphQLProvider } from '@/components/ApolloGraphQLProvider';

export const metadata: Metadata = {
  applicationName: 'DurgasOS',
  title: 'DurgasOS - AI Desktop Environment',
  description: 'DurgasOS — AI desktop shell with GraphQL and WebSocket gateway integration.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'DurgasOS',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Skip to content
        </a>
        <GlassFilter />
        <ApolloGraphQLProvider>
          <AppProviders>{children}</AppProviders>
        </ApolloGraphQLProvider>
      </body>
    </html>
  );
}
