import type { Metadata } from 'next';
import './globals.css'; // Global styles
import { AppProviders } from '@/components/AppProviders';
import { GlassFilter } from '@/components/ui/liquid-glass';
import { ApolloGraphQLProvider } from '@/components/ApolloGraphQLProvider';

export const metadata: Metadata = {
  title: 'DurgasOS - AI Desktop Environment',
  description: 'DurgasOS — AI desktop shell with GraphQL and WebSocket gateway integration.',
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
