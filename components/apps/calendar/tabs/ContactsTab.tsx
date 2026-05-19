'use client';

import { useQuery } from '@apollo/client/react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { GOOGLE_PEOPLE_LIST_CONTACTS } from '@/lib/graphql-modules';
import { parsePeopleConnection, type PeopleConnectionView } from '@/lib/google-people-format';

type PeoplePayload = {
  success?: boolean;
  connections?: Array<Record<string, unknown>>;
};

export function ContactsTab({
  active,
  accessToken,
}: {
  active: boolean;
  accessToken: string | null;
}) {
  const [q, setQ] = useState('');
  const peopleQ = useQuery(GOOGLE_PEOPLE_LIST_CONTACTS, {
    skip: !active || !accessToken,
    variables: {
      params: {
        access_token: accessToken,
        page_size: 200,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const rows = useMemo(() => {
    const p = peopleQ.data?.googlePeopleListContacts as PeoplePayload | undefined;
    if (!p?.success || !Array.isArray(p.connections)) return [];
    return p.connections
      .map((c, i) => parsePeopleConnection(c as Record<string, unknown>, i))
      .filter((row): row is PeopleConnectionView => row != null);
  }, [peopleQ.data?.googlePeopleListContacts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) => r.displayName.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Contacts</h1>
        <input
          type="search"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {!accessToken ? (
        <p className="text-sm text-slate-500">Select an account with a valid token.</p>
      ) : peopleQ.loading ? (
        <p className="text-sm text-slate-400">Loading contacts…</p>
      ) : peopleQ.error ? (
        <p className="text-sm text-red-600">{peopleQ.error.message}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {filtered.slice(0, 8).map((c) => (
              <div
                key={c.resourceName}
                className="flex flex-col items-center gap-3 rounded-[2.5rem] border border-slate-100 bg-white p-6 text-center shadow-xl shadow-slate-200/50"
              >
                {c.photoUrl ? (
                  <Image
                    src={c.photoUrl}
                    alt=""
                    width={84}
                    height={84}
                    unoptimized
                    className="mb-1 h-[84px] w-[84px] rounded-full object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="mb-1 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-indigo-100 text-xl font-black text-indigo-700 shadow-md">
                    {c.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="line-clamp-2 text-sm font-bold text-slate-900">{c.displayName}</p>
                {c.email ? <p className="line-clamp-2 text-xs text-slate-500">{c.email}</p> : null}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {filtered.slice(8).map((c) => (
              <div
                key={c.resourceName}
                className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                {c.photoUrl ? (
                  <Image
                    src={c.photoUrl}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {c.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{c.displayName}</p>
                  {c.email ? <p className="truncate text-xs text-slate-500">{c.email}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
