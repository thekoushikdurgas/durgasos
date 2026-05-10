'use client';

import { useMutation } from '@apollo/client/react';
import { useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AuthModalStatus } from '@/components/auth/AuthStatusModal';
import { getAuthModalLoadingDurationMs } from '@/components/auth/AuthStatusModal';
import { formatMutationFailure } from '@/components/auth/auth-mutation-helpers';
import { establishSession } from '@/lib/establish-session';
import { SIGN_UP } from '@/lib/graphql-auth';

import type { RefObject } from 'react';

import type { ConfettiRef } from '@/components/auth/ConfettiCanvas';

type AuthSessionGql = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number | null;
};

type SignUpMutationData = {
  signUp: {
    success: boolean;
    requiresConfirmation: boolean;
    user?: { id: string; email?: string | null } | null;
    session?: AuthSessionGql | null;
  };
};

export function useSignUpFlow(confettiRef: RefObject<ConfettiRef | null>) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion === true;

  const mountedRef = useRef(true);
  const timeoutIdsRef = useRef<number[]>([]);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      fn();
    }, ms) as unknown as number;
    timeoutIdsRef.current.push(id);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
    };
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'password' | 'confirmPassword'>('email');
  const [modalStatus, setModalStatus] = useState<AuthModalStatus>('closed');
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  const [signUpMutation, { loading: signingUp }] = useMutation<SignUpMutationData>(SIGN_UP);

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const fireSideCanons = useCallback(() => {
    if (reduceMotion) return;
    const fire = confettiRef.current?.fire;
    if (fire) {
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const particleCount = 50;
      fire({ ...defaults, particleCount, origin: { x: 0, y: 1 }, angle: 60 });
      fire({ ...defaults, particleCount, origin: { x: 1, y: 1 }, angle: 120 });
    }
  }, [reduceMotion, confettiRef]);

  const persistSessionAndGoHome = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn?: number | null) => {
      await establishSession(accessToken, refreshToken, expiresIn ?? undefined);
      router.push('/');
      router.refresh();
    },
    [router]
  );

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalStatus !== 'closed' || authStep !== 'confirmPassword') return;

    if (password !== confirmPassword) {
      setModalErrorMessage('Passwords do not match!');
      setModalStatus('error');
      return;
    }

    setModalStatus('loading');
    try {
      const result = await signUpMutation({
        variables: { email, password, metadata: {} },
      });
      if (result.error) {
        throw new Error(formatMutationFailure(result.error));
      }
      const payload = result.data?.signUp;
      if (!payload?.success) {
        throw new Error('Sign up failed');
      }
      const totalDuration = getAuthModalLoadingDurationMs(reduceMotion);
      if (payload.requiresConfirmation && !payload.session) {
        scheduleTimeout(() => {
          if (!mountedRef.current) return;
          setModalStatus('success');
        }, totalDuration);
        return;
      }
      const sess = payload.session;
      if (!sess?.accessToken || !sess.refreshToken) {
        throw new Error('No session returned');
      }
      scheduleTimeout(async () => {
        if (!mountedRef.current) return;
        fireSideCanons();
        try {
          await persistSessionAndGoHome(sess.accessToken, sess.refreshToken, sess.expiresIn);
        } catch (err) {
          setModalErrorMessage(err instanceof Error ? err.message : 'Session error');
          setModalStatus('error');
        }
      }, totalDuration);
    } catch (err) {
      setModalErrorMessage(err instanceof Error ? err.message : 'Sign up failed');
      setModalStatus('error');
    }
  };

  const handleProgressStep = () => {
    if (authStep === 'email') {
      if (isEmailValid) setAuthStep('password');
    } else if (authStep === 'password') {
      if (isPasswordValid) setAuthStep('confirmPassword');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProgressStep();
    }
  };

  const handleGoBack = () => {
    if (authStep === 'confirmPassword') {
      setAuthStep('password');
      setConfirmPassword('');
    } else if (authStep === 'password') setAuthStep('email');
  };

  const closeModal = () => {
    setModalStatus('closed');
    setModalErrorMessage('');
  };

  useEffect(() => {
    const delayMs = reduceMotion ? 0 : 500;
    const tid = window.setTimeout(() => {
      if (authStep === 'password') passwordInputRef.current?.focus();
      else if (authStep === 'confirmPassword') confirmPasswordInputRef.current?.focus();
    }, delayMs);
    return () => clearTimeout(tid);
  }, [authStep, reduceMotion]);

  useEffect(() => {
    if (modalStatus === 'success') {
      fireSideCanons();
    }
  }, [modalStatus, fireSideCanons]);

  const oauthSoon = () => {
    setModalErrorMessage(
      'Google and GitHub sign-in are not connected in this build yet. Use email and password to create your Durgas OS account.'
    );
    setModalStatus('error');
  };

  const busy = signingUp;
  const fieldsetAriaBusy = busy || modalStatus === 'loading';

  const onContinueSuccess = useCallback(() => {
    router.push('/');
    router.refresh();
  }, [router]);

  return {
    reduceMotion,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    authStep,
    modalStatus,
    modalErrorMessage,
    closeModal,
    onContinueSuccess,
    passwordInputRef,
    confirmPasswordInputRef,
    handleFinalSubmit,
    handleProgressStep,
    handleKeyDown,
    handleGoBack,
    oauthSoon,
    busy,
    fieldsetAriaBusy,
    isEmailValid,
    isPasswordValid,
    isConfirmPasswordValid,
  };
}
