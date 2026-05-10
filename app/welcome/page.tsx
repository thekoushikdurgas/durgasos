'use client';

import '@/app/auth-glass.css';

import { WelcomeSignUpSection } from '@/components/auth/WelcomeSignUpSection';
import VaporizeTextCycle, { Tag } from '@/components/ui/vaporize-text-cycle';
import { cn } from '@/lib/utils';

export default function WelcomePage() {
  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] w-screen flex-col overflow-y-auto bg-transparent text-foreground">
      <div
        className={cn(
          'fixed top-4 left-4 z-20 flex items-center justify-center gap-2 overflow-visible',
          'md:left-1/2 md:-translate-x-1/2'
        )}
      >
        <span className="sr-only">Durgas OS</span>
        {/* Vapor wordmark; primary page title lives in WelcomeSignUpSection */}
        <div className="flex h-7 min-w-[7rem] max-w-[10rem] origin-center scale-[2] justify-center">
          <VaporizeTextCycle
            className="h-full w-full"
            texts={['Durgas OS', 'Durgasos']}
            font={{
              fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
              fontSize: '18px',
              fontWeight: 600,
            }}
            color="rgb(226, 232, 240)"
            alignment="left"
            direction="left-to-right"
            tag={Tag.P}
            spread={3}
            density={5}
            animation={{
              vaporizeDuration: 2.4,
              fadeInDuration: 1,
              waitDuration: 1.4,
            }}
          />
        </div>
      </div>

      <div className="relative z-10 mx-0 flex h-full min-h-0 w-full flex-1 flex-col items-center">
        <WelcomeSignUpSection />
      </div>
    </div>
  );
}
