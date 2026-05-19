'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect, useMemo, useState } from 'react';

import { GET_LINKED_GOOGLE_ACCOUNT_TOKEN, LINKED_GOOGLE_ACCOUNTS, ME } from '@/lib/graphql-modules';
import {
  parseLinkedGoogleAccounts,
  type LinkedGoogleAccountRow,
} from '@/lib/linked-google-accounts';
import { readGoogleTokenPayload } from '@/lib/read-google-token-payload';

export function useLinkedGoogleAccount(): {
  authed: boolean;
  accounts: LinkedGoogleAccountRow[];
  googleUserId: string | null;
  setGoogleUserId: (id: string | null) => void;
  accessToken: string | null;
  tokenLoading: boolean;
  linkedLoading: boolean;
} {
  const meQ = useQuery(ME);
  const authed = Boolean(meQ.data?.me?.id);

  const linkedQ = useQuery(LINKED_GOOGLE_ACCOUNTS, {
    skip: !authed,
    fetchPolicy: 'cache-and-network',
  });
  const accounts = useMemo(
    () => parseLinkedGoogleAccounts(linkedQ.data?.linkedGoogleAccounts),
    [linkedQ.data?.linkedGoogleAccounts]
  );

  const [googleUserId, setGoogleUserId] = useState<string | null>(null);
  useEffect(() => {
    if (accounts.length === 0) {
      queueMicrotask(() => setGoogleUserId(null));
      return;
    }
    queueMicrotask(() => {
      setGoogleUserId((prev) => {
        if (prev && accounts.some((a) => a.googleUserId === prev)) return prev;
        return accounts[0]!.googleUserId;
      });
    });
  }, [accounts]);

  const tokenQ = useQuery(GET_LINKED_GOOGLE_ACCOUNT_TOKEN, {
    skip: !authed || !googleUserId,
    variables: { googleUserId: googleUserId ?? '' },
    fetchPolicy: 'cache-and-network',
  });

  const accessToken = useMemo(() => {
    const raw = tokenQ.data?.getLinkedGoogleAccountToken;
    return readGoogleTokenPayload(raw).accessToken;
  }, [tokenQ.data?.getLinkedGoogleAccountToken]);

  return {
    authed,
    accounts,
    googleUserId,
    setGoogleUserId,
    accessToken,
    tokenLoading: tokenQ.loading,
    linkedLoading: linkedQ.loading,
  };
}
