'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import { AuthSignUpFieldset } from '@/components/auth/AuthSignUpFieldset';
import { AuthStatusModal } from '@/components/auth/AuthStatusModal';
import { BlurFade } from '@/components/auth/BlurFade';
import { ConfettiCanvas, type ConfettiRef } from '@/components/auth/ConfettiCanvas';
import { GlassButton } from '@/components/auth/GlassAuthButton';
import { useSignUpFlow } from '@/components/auth/use-sign-up-flow';

export function WelcomeSignUpSection() {
  const confettiRef = useRef<ConfettiRef>(null);
  const signUp = useSignUpFlow(confettiRef);

  return (
    <>
      <ConfettiCanvas
        ref={confettiRef}
        manualstart
        className="pointer-events-none fixed top-0 left-0 z-[999] h-full w-full"
      />
      <AuthStatusModal
        status={signUp.modalStatus}
        errorMessage={signUp.modalErrorMessage}
        onClose={signUp.closeModal}
        onContinueSuccess={signUp.onContinueSuccess}
        reduceMotion={signUp.reduceMotion}
      />

      <section
        id="create-account"
        className="relative z-[5] m-0 flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center p-0"
        aria-label="Create account"
      >
        <div className="relative flex h-fit w-fit max-w-full flex-col items-center justify-center overflow-y-auto rounded-2xl border border-border bg-card/45 backdrop-blur-md">
          <div className="mx-auto w-full max-w-2xl shrink-0 space-y-6 px-4 pt-6 pb-2 text-center">
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

            <BlurFade delay={0.25 * 3} className="flex flex-col items-center justify-center gap-4">
              <GlassButton
                asChild
                size="default"
                className="inline-flex w-fit flex-col items-center justify-center"
              >
                <Link
                  href="#create-account"
                  className="text-foreground inline-flex items-center justify-center gap-2 no-underline"
                  aria-label="Get started — focus create account form"
                >
                  Get started
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </GlassButton>
            </BlurFade>
          </div>

          <div className="flex w-full flex-row items-center justify-center px-0 pb-4">
            <AuthSignUpFieldset
              disabled={signUp.busy || signUp.modalStatus !== 'closed'}
              ariaBusy={signUp.fieldsetAriaBusy}
              reduceMotion={signUp.reduceMotion}
              authStep={signUp.authStep}
              email={signUp.email}
              setEmail={signUp.setEmail}
              password={signUp.password}
              setPassword={signUp.setPassword}
              confirmPassword={signUp.confirmPassword}
              setConfirmPassword={signUp.setConfirmPassword}
              showPassword={signUp.showPassword}
              setShowPassword={signUp.setShowPassword}
              showConfirmPassword={signUp.showConfirmPassword}
              setShowConfirmPassword={signUp.setShowConfirmPassword}
              isEmailValid={signUp.isEmailValid}
              isPasswordValid={signUp.isPasswordValid}
              isConfirmPasswordValid={signUp.isConfirmPasswordValid}
              handleProgressStep={signUp.handleProgressStep}
              handleKeyDown={signUp.handleKeyDown}
              handleGoBack={signUp.handleGoBack}
              handleFinalSubmit={signUp.handleFinalSubmit}
              passwordInputRef={signUp.passwordInputRef}
              confirmPasswordInputRef={signUp.confirmPasswordInputRef}
              oauthSoon={signUp.oauthSoon}
              isExistingAccount={signUp.isExistingAccount}
            />
          </div>
        </div>
      </section>
    </>
  );
}
