import type { Metadata } from 'next';
import './globals.css'; // Global styles
import { AppProviders } from '@/components/AppProviders';
import { GlassFilter } from '@/components/ui/liquid-glass';
import { ApolloGraphQLProvider } from '@/components/ApolloGraphQLProvider';

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning>
        <GlassFilter />
        <ApolloGraphQLProvider>
          <AppProviders>{children}</AppProviders>
        </ApolloGraphQLProvider>
      </body>
    </html>
  );
}
