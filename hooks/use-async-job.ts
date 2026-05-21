'use client';

import type { ApolloClient } from '@apollo/client';

import { JOB_STATUS } from '@/lib/graphql-modules';
import { dispatchOsLog, dispatchOsNotification } from '@/lib/notifications';

export type AsyncJobEnvelope = {
  async?: boolean;
  job_id?: string;
  jobId?: string;
  status?: string;
};

export function isAsyncJobResponse(v: unknown): v is AsyncJobEnvelope {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.async !== true) return false;
  const jid = o.job_id ?? o.jobId;
  return typeof jid === 'string' && jid.length > 0;
}

export function getJobIdFromEnvelope(v: AsyncJobEnvelope): string {
  return String(v.job_id ?? v.jobId ?? '');
}

/** Poll `jobStatus` until done/error or timeout. */
export async function waitForGraphqlJob(
  client: ApolloClient,
  jobId: string,
  options?: { pollMs?: number; timeoutMs?: number; label?: string }
): Promise<unknown> {
  const pollMs = options?.pollMs ?? 500;
  const timeoutMs = options?.timeoutMs ?? 600_000;
  const label = options?.label ?? 'Background job';
  const start = Date.now();
  dispatchOsLog({
    category: 'job',
    message: `${label} started (${jobId.slice(0, 8)}…)`,
    level: 'info',
    meta: { jobId },
  });
  try {
    for (;;) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Job polling timed out');
      }
      const { data, error } = await client.query({
        query: JOB_STATUS,
        variables: { jobId },
        fetchPolicy: 'network-only',
      });
      if (error) throw error;
      const st = data?.jobStatus;
      if (!st) throw new Error('Job not found');
      if (st.status === 'done') {
        dispatchOsNotification({
          title: `${label} complete`,
          body: jobId,
          level: 'success',
        });
        dispatchOsLog({
          category: 'job',
          message: `${label} finished`,
          level: 'info',
          meta: { jobId },
        });
        return st.result;
      }
      if (st.status === 'error') {
        throw new Error(st.error || 'Job failed');
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    dispatchOsNotification({
      title: `${label} failed`,
      body: msg,
      level: 'error',
    });
    dispatchOsLog({
      category: 'job',
      message: `${label} error: ${msg}`,
      level: 'error',
      meta: { jobId },
    });
    throw e;
  }
}
