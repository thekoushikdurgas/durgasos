'use client';

import '@/app/auth-glass.css';

import { useRef } from 'react';

import { AuthSignUpFieldset } from '@/components/auth/AuthSignUpFieldset';
import { AuthStatusModal } from '@/components/auth/AuthStatusModal';
import { ConfettiCanvas, type ConfettiRef } from '@/components/auth/ConfettiCanvas';
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
        className="relative z-[5] mt-10 flex w-full flex-col items-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
        aria-labelledby="create-account-heading"
      >
        <h2 id="create-account-heading" className="sr-only">
          Create your account
        </h2>
        <div className="relative flex min-h-[min(560px,70vh)] w-full max-w-[min(420px,100vw-2rem)] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/45 backdrop-blur-md">
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
            signUpFooter="sign-in-cta"
          />
        </div>
      </section>
    </>
  );
}
