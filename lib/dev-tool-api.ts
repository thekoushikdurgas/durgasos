import { buildBackendAuthHeaders } from '@/lib/backend-http';
import { getBackendOrigin } from '@/lib/backend-url';

const BASE = () => `${getBackendOrigin()}/api/dev-tool`;

async function devToolFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
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

export async function minifyCode(code: string, language: string): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/minify', {
    method: 'POST',
    json: { code, language },
  });
  return r.text;
}

export async function generateCheatsheet(topic: string): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/cheatsheet', {
    method: 'POST',
    json: { topic },
  });
  return r.text;
}

export async function generateAndExplainRegex(
  description: string
): Promise<{ regex: string; explanation: string }> {
  return devToolFetch('/regex/generate', { method: 'POST', json: { description } });
}

export async function explainRegex(regex: string): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/regex/explain', {
    method: 'POST',
    json: { regex },
  });
  return r.text;
}

export async function generateTypes(
  jsonString: string,
  typeSystem: 'TypeScript' | 'Zod Schema',
  rootTypeName: string
): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/json-to-type', {
    method: 'POST',
    json: { jsonString, typeSystem, rootTypeName },
  });
  return r.text;
}

export async function refactorCode(
  code: string,
  language: string,
  instructions: string
): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/refactor', {
    method: 'POST',
    json: { code, language, instructions },
  });
  return r.text;
}

export async function enhancePrompt(prompt: string): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/prompt/enhance', {
    method: 'POST',
    json: { prompt },
  });
  return r.text;
}

export async function generateCetoPrompts(topic: string): Promise<string> {
  const r = await devToolFetch<{ text: string }>('/prompt/ceto', {
    method: 'POST',
    json: { topic },
  });
  return r.text;
}

export async function analyzeWebsiteHtml(
  html: string,
  url?: string
): Promise<{
  generatedCode: string;
  assets: {
    images: string[];
    videos: string[];
    scripts: string[];
    styles: string[];
  };
  pageInfo: Record<string, unknown>;
}> {
  return devToolFetch('/website/analyze', {
    method: 'POST',
    json: { html, url },
  });
}

export type MemoryItem = {
  id: string;
  userId: string;
  type: 'text' | 'url' | 'file';
  title: string;
  content: string;
  createdAt: number;
};

export async function listMemories(): Promise<MemoryItem[]> {
  const r = await devToolFetch<{ items: MemoryItem[] }>('/memories');
  return r.items;
}

export async function createMemory(
  type: 'text' | 'url' | 'file',
  content: string,
  title?: string
): Promise<MemoryItem> {
  return devToolFetch('/memories', {
    method: 'POST',
    json: { type, content, title },
  });
}

export async function deleteMemory(id: string): Promise<void> {
  await devToolFetch(`/memories/${id}`, { method: 'DELETE' });
}

export type RegexHistoryItem = {
  id: string;
  mode: 'generate' | 'explain';
  input: string;
  regex?: string;
  explanation: string;
  timestamp: number;
};

export async function listRegexHistory(): Promise<RegexHistoryItem[]> {
  const r = await devToolFetch<{ items: RegexHistoryItem[] }>('/regex-history');
  return r.items;
}

export async function saveRegexHistory(
  item: Omit<RegexHistoryItem, 'id' | 'timestamp'>
): Promise<RegexHistoryItem> {
  return devToolFetch('/regex-history', {
    method: 'POST',
    json: {
      mode: item.mode,
      input: item.input,
      regex: item.regex,
      explanation: item.explanation,
    },
  });
}

export async function deleteRegexHistory(id: string): Promise<void> {
  await devToolFetch(`/regex-history/${id}`, { method: 'DELETE' });
}

export type IconHistoryItem = {
  id: string;
  source_image_path: string;
  source_image_url: string;
  created_at: string;
};

export async function listIconHistory(): Promise<IconHistoryItem[]> {
  const r = await devToolFetch<{ items: IconHistoryItem[] }>('/icon-history');
  return r.items;
}

export async function saveIconHistory(
  sourceStoragePath: string,
  sourceImageUrl?: string
): Promise<IconHistoryItem> {
  return devToolFetch('/icon-history', {
    method: 'POST',
    json: { sourceStoragePath, sourceImageUrl },
  });
}

export async function deleteIconHistory(id: string): Promise<void> {
  await devToolFetch(`/icon-history/${id}`, { method: 'DELETE' });
}

export async function uploadDevToolFile(
  file: File,
  subpath = 'icons'
): Promise<{ path: string; signed_url: string; public_url: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('subpath', subpath);
  const headers = buildBackendAuthHeaders();
  const res = await fetch(`${BASE()}/upload`, {
    method: 'POST',
    headers,
    body: fd,
  });
  if (!res.ok) {
    throw new Error(await res.text().catch(() => res.statusText));
  }
  return res.json();
}
