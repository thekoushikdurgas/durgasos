'use client';

import '@/app/auth-glass.css';

import { Gem } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

import { AuthSignInFieldset } from '@/components/auth/AuthSignInFieldset';
import { AuthStatusModal } from '@/components/auth/AuthStatusModal';
import { useSignInFlow } from '@/components/auth/use-sign-in-flow';

export default function LoginPage() {
  const signIn = useSignInFlow();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion === true;

  return (
    <div className="flex min-h-screen w-screen flex-col bg-transparent">
      <AuthStatusModal
        status={signIn.modalStatus}
        errorMessage={signIn.modalErrorMessage}
        onClose={signIn.closeModal}
        onContinueSuccess={() => signIn.closeModal()}
        reduceMotion={reduceMotion}
      />

      <div className="fixed top-4 left-4 z-20 flex items-center gap-2 md:left-1/2 md:-translate-x-1/2">
        <div className="bg-primary text-primary-foreground rounded-md p-1.5">
          <Gem className="h-4 w-4" />
        </div>
        <h1 className="text-foreground text-base font-bold">Durgas OS</h1>
      </div>

      <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-none border-0 bg-card/45 backdrop-blur-md md:mx-auto md:my-auto md:mt-24 md:max-h-[calc(100dvh-8rem)] md:max-w-lg md:rounded-2xl md:border md:border-border">
        <AuthSignInFieldset
          disabled={signIn.busy || signIn.modalStatus !== 'closed'}
          ariaBusy={signIn.fieldsetAriaBusy}
          email={signIn.email}
          setEmail={signIn.setEmail}
          password={signIn.password}
          setPassword={signIn.setPassword}
          showPassword={signIn.showPassword}
          setShowPassword={signIn.setShowPassword}
          busy={signIn.busy}
          isEmailValid={signIn.isEmailValid}
          isPasswordValid={signIn.isPasswordValid}
          onSubmit={signIn.handleSignInSubmit}
        />
      </div>
    </div>
  );
}
