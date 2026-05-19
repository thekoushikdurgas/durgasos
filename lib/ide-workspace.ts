/** Hybrid workspace helpers for Void IDE (virtual samples + optional File System Access). */

export type IdeWorkspaceMode = 'virtual' | 'fsa';

const TEXT_EXT = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'md',
  'mdx',
  'css',
  'scss',
  'html',
  'htm',
  'xml',
  'yaml',
  'yml',
  'toml',
  'txt',
  'env',
  'gitignore',
  'svg',
  'graphql',
  'py',
  'rs',
  'go',
  'java',
  'kt',
  'swift',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'sql',
  'sh',
  'bat',
  'ps1',
  'dockerfile',
]);

export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  'coverage',
  '__pycache__',
]);

const MAX_LISTED_FILES = 450;
const MAX_WALK_DEPTH = 10;

export function isProbablyTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower === 'dockerfile' || lower === 'makefile' || lower === 'readme') return true;
  const i = lower.lastIndexOf('.');
  if (i === -1) return lower.length < 40;
  const ext = lower.slice(i + 1);
  return TEXT_EXT.has(ext);
}

export function pathToMonacoLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    json: 'json',
    md: 'markdown',
    mdx: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'ini',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    graphql: 'graphql',
    sql: 'sql',
    sh: 'shell',
    ps1: 'powershell',
  };
  return map[ext] ?? 'plaintext';
}

/** Seed workspace when no folder is open (hybrid default). */
export const VOID_IDE_SAMPLE_FILES: Record<string, { language: string; content: string }> = {
  'README.md': {
    language: 'markdown',
    content: `# Sample workspace

This is the **Void-style IDE** in DurgasOS. Use the AI panel to ask about \`src/main.ts\`.

- **Open folder…** uses the File System Access API (Chromium). Handles are not persisted across full page reloads.
- **Save** writes the active file (virtual or disk).
`,
  },
  'src/main.ts': {
    language: 'typescript',
    content: `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export function main(): void {
  console.log(greet('DurgasOS'));
}

main();
`,
  },
  'src/lib/utils.ts': {
    language: 'typescript',
    content: `/** Tiny helpers for the sample app. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
`,
  },
  'package.json': {
    language: 'json',
    content: `{
  "name": "void-ide-sample",
  "private": true,
  "scripts": {
    "build": "tsc"
  }
}
`,
  },
};

export function truncateForContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2) - 20;
  return `${text.slice(0, half)}\n\n/* … truncated … */\n\n${text.slice(-half)}`;
}

export function buildIdeAiContext(parts: {
  path: string;
  language: string;
  fileContent: string;
  selectionSnippet?: string;
  maxFileChars?: number;
}): string {
  const max = parts.maxFileChars ?? 14_000;
  const body = truncateForContext(parts.fileContent, max);
  const lines = [
    `Open file: ${parts.path}`,
    `Language: ${parts.language}`,
    '',
    '<file_contents>',
    body,
    '</file_contents>',
  ];
  if (parts.selectionSnippet?.trim()) {
    lines.push('', '<selection>', parts.selectionSnippet.trim(), '</selection>');
  }
  return lines.join('\n');
}

export type MultiFileContextEntry = { path: string; language: string; content: string };

/** Additional workspace files to include in chat context (truncated). */
export function buildMultiFileContext(
  files: MultiFileContextEntry[],
  options?: { maxTotalChars?: number; maxPerFileChars?: number }
): string {
  const maxTotal = options?.maxTotalChars ?? 28_000;
  const maxPer = options?.maxPerFileChars ?? 8_000;
  const lines: string[] = ['<multi_file_context>'];
  let budget = maxTotal;
  for (const f of files) {
    if (budget <= 100) {
      lines.push('', '<!-- further files omitted (context limit) -->');
      break;
    }
    const chunk = truncateForContext(f.content, Math.min(maxPer, Math.max(0, budget - 200)));
    const block = `\n--- file: ${f.path} (${f.language}) ---\n${chunk}`;
    lines.push(block);
    budget -= block.length;
  }
  lines.push('', '</multi_file_context>');
  return lines.join('\n').trim();
}

/** Rough token estimate (~4 chars per token) for prompt budgeting. */
export function estimateContextTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function pickWorkspaceFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    return null;
  }
  try {
    const w = window as unknown as {
      showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
    };
    return (await w.showDirectoryPicker?.({ mode: 'readwrite' })) ?? null;
  } catch {
    return null;
  }
}

export async function listProjectTextFiles(root: FileSystemDirectoryHandle): Promise<string[]> {
  const out: string[] = [];

  type DirWithEntries = FileSystemDirectoryHandle & {
    entries: () => AsyncIterableIterator<
      [string, FileSystemFileHandle | FileSystemDirectoryHandle]
    >;
  };

  async function walk(dh: FileSystemDirectoryHandle, prefix: string, depth: number): Promise<void> {
    if (out.length >= MAX_LISTED_FILES || depth > MAX_WALK_DEPTH) return;
    for await (const [name, handle] of (dh as DirWithEntries).entries()) {
      if (out.length >= MAX_LISTED_FILES) break;
      if (handle.kind === 'directory') {
        if (SKIP_DIRS.has(name)) continue;
        const sub = handle as FileSystemDirectoryHandle;
        const p = prefix ? `${prefix}/${name}` : name;
        await walk(sub, p, depth + 1);
      } else if (handle.kind === 'file' && isProbablyTextFile(name)) {
        const p = prefix ? `${prefix}/${name}` : name;
        out.push(p);
      }
    }
  }

  await walk(root, '', 0);
  return out.sort((a, b) => a.localeCompare(b));
}

async function getFileHandleForRead(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<FileSystemFileHandle> {
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('Empty path');
  }
  let dir = root;
  for (let i = 0; i < segments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segments[i]!, { create: false });
  }
  return dir.getFileHandle(segments[segments.length - 1]!, { create: false });
}

async function getFileHandleForWrite(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<FileSystemFileHandle> {
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('Empty path');
  }
  let dir = root;
  for (let i = 0; i < segments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segments[i]!, { create: true });
  }
  return dir.getFileHandle(segments[segments.length - 1]!, { create: true });
}

export async function readTextFileFromRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<string> {
  const fh = await getFileHandleForRead(root, relativePath);
  const file = await fh.getFile();
  return await file.text();
}

export async function writeTextFileToRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  text: string
): Promise<void> {
  const fh = await getFileHandleForWrite(root, relativePath);
  const w = await fh.createWritable();
  try {
    await w.write(text);
  } finally {
    await w.close();
  }
}
