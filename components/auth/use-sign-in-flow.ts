'use client';

import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { AuthModalStatus } from '@/components/auth/AuthStatusModal';
import { establishSession } from '@/lib/establish-session';
import { SIGN_IN } from '@/lib/graphql-auth';

import { formatMutationFailure } from '@/components/auth/auth-mutation-helpers';

type AuthSessionGql = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number | null;
};

type SignInMutationData = {
  signIn: {
    success: boolean;
    requiresConfirmation: boolean;
    user?: { id: string; email?: string | null } | null;
    session?: AuthSessionGql | null;
  };
};

export function useSignInFlow() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalStatus, setModalStatus] = useState<AuthModalStatus>('closed');
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  const [signInMutation, { loading: signingIn }] = useMutation<SignInMutationData>(SIGN_IN);

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;

  const persistSessionAndGoHome = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn?: number | null) => {
      await establishSession(accessToken, refreshToken, expiresIn ?? undefined);
      router.push('/');
      router.refresh();
    },
    [router]
  );

  const closeModal = useCallback(() => {
    setModalStatus('closed');
    setModalErrorMessage('');
  }, []);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || !isPasswordValid) return;
    setModalStatus('loading');
    try {
      setModalErrorMessage('');
      const result = await signInMutation({
        variables: { email, password },
      });
      if (result.error) {
        throw new Error(formatMutationFailure(result.error));
      }
      const payload = result.data?.signIn;
      const sess = payload?.session;
      if (!payload?.success || !sess?.accessToken || !sess.refreshToken) {
        throw new Error('Invalid email or password');
      }
      await persistSessionAndGoHome(sess.accessToken, sess.refreshToken, sess.expiresIn);
    } catch (err) {
      setModalErrorMessage(err instanceof Error ? err.message : 'Sign in failed');
      setModalStatus('error');
    }
  };

  const busy = signingIn;
  const fieldsetAriaBusy = busy || modalStatus === 'loading';

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    modalStatus,
    modalErrorMessage,
    closeModal,
    handleSignInSubmit,
    busy,
    fieldsetAriaBusy,
    isEmailValid,
    isPasswordValid,
  };
}
