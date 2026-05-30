import { buildBackendAuthHeaders } from '@/lib/backend-http';
import { getBackendOrigin } from '@/lib/backend-url';

const BASE = () => `${getBackendOrigin()}/api/repo-reverse`;

async function repoReverseFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const auth = buildBackendAuthHeaders();
  for (const [k, v] of Object.entries(auth)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export type RepoMetadata = {
  stars: number;
  forks: number;
  ownerAvatar: string;
  language: string;
  license: string;
  owner: string;
  repo: string;
};

export type AnalyzeResult = {
  prompt: string;
  metadata: RepoMetadata;
};

export type TreeResult = {
  owner: string;
  repo: string;
  defaultBranch: string;
  files: string[];
  description: string;
  language: string;
};

export async function fetchRepoTree(owner: string, repo: string): Promise<TreeResult> {
  return repoReverseFetch<TreeResult>('/tree', {
    method: 'POST',
    json: { owner, repo },
  });
}

export async function analyzeRepository(params: {
  owner: string;
  repo: string;
  model?: string;
  apiKey?: string;
  style?: string;
  manualFiles?: string[];
}): Promise<AnalyzeResult> {
  return repoReverseFetch<AnalyzeResult>('/analyze', {
    method: 'POST',
    json: params,
  });
}

export async function adaptPrompt(params: {
  originalPrompt: string;
  newAppDescription?: string;
  techStackChanges?: string;
  model?: string;
  apiKey?: string;
}): Promise<{ prompt: string }> {
  return repoReverseFetch<{ prompt: string }>('/adapt', {
    method: 'POST',
    json: params,
  });
}

export async function refinePrompt(params: {
  originalPrompt: string;
  rating: number;
  feedbackTags?: string[];
  feedbackText?: string;
  model?: string;
  apiKey?: string;
}): Promise<{ prompt: string }> {
  return repoReverseFetch<{ prompt: string }>('/refine', {
    method: 'POST',
    json: params,
  });
}
