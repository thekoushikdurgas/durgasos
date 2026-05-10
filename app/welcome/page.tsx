'use client';

import '@/app/auth-glass.css';

import { ArrowRight, Gem, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { BlurFade } from '@/components/auth/BlurFade';
import { GlassButton } from '@/components/auth/GlassAuthButton';
import { WelcomeSignUpSection } from '@/components/auth/WelcomeSignUpSection';
import VaporizeTextCycle, { Tag } from '@/components/ui/vaporize-text-cycle';
import { cn } from '@/lib/utils';

export default function WelcomePage() {
  return (
    <div className="relative flex min-h-[100dvh] w-screen flex-col overflow-y-auto bg-transparent text-foreground">
      <div
        className={cn(
          'fixed top-4 left-4 z-20 flex items-center gap-2',
          'md:left-1/2 md:-translate-x-1/2'
        )}
      >
        <div className="bg-primary text-primary-foreground rounded-md p-1.5">
          <Gem className="h-4 w-4" />
        </div>
        <span className="sr-only">Durgas OS</span>
        {/* One vapor canvas on welcome; page heading remains the hero h1 below */}
        <div className="h-7 min-w-[7rem] max-w-[10rem]">
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

      <div className="fixed top-4 right-4 z-20 max-w-[min(12rem,calc(100vw-8rem))] text-right">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          <span className="sm:hidden">Sign in</span>
          <span className="hidden sm:inline">Already have an account?</span>
        </Link>
      </div>

      <div className="relative z-10 mx-auto mt-14 flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-8 pt-10">
        <div className="max-w-2xl space-y-6 text-center">
          <BlurFade delay={0.25 * 1} className="flex justify-center">
            <div className="text-primary border-border bg-card/50 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              First-run experience
            </div>
          </BlurFade>

          <BlurFade delay={0.25 * 2} className="w-full">
            <h1 className="font-serif text-4xl font-light tracking-tight sm:text-5xl md:text-6xl">
              Welcome to your desktop
            </h1>
          </BlurFade>

          <BlurFade delay={0.25 * 3} className="w-full">
            <p className="text-muted-foreground mx-auto max-w-lg text-base leading-relaxed sm:text-lg">
              A glassy, focused workspace. Sign in to open the OS, or create an account to get
              started with the full experience.
            </p>
          </BlurFade>

          <BlurFade delay={0.25 * 4} className="flex flex-col items-center justify-center gap-4">
            <GlassButton
              asChild
              size="default"
              className="inline-flex w-fit flex-col items-center justify-center"
            >
              <Link
                href="#create-account"
                className="text-foreground inline-flex items-center justify-center gap-2 no-underline"
                aria-label="Get started — create an account below"
              >
                Get started
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </GlassButton>
            <p className="text-muted-foreground max-w-md text-xs sm:text-sm">
              You will use email and password. OAuth can be enabled later via Supabase.
            </p>
          </BlurFade>
        </div>

        <WelcomeSignUpSection />
      </div>
    </div>
  );
}
