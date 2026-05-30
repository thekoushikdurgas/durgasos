import type { AppId } from '@/lib/apps';
import { APPS } from '@/lib/apps';

/** Lowercase extension without dot — which apps can open files with that extension. */
export const APP_SUPPORTED_EXTENSIONS: Record<AppId, readonly string[]> = {
  explorer: [],
  settings: [],
  terminal: ['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'],
  browser: ['htm', 'html', 'pdf', 'xhtml', 'rss', 'atom', 'mhtml', 'webarchive'],
  gallery: [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'bmp',
    'ico',
    'avif',
    'heic',
    'tiff',
    'tif',
    'jxl',
    'raw',
    'cr2',
    'nef',
    'dng',
    'psd',
  ],
  chat: [],
  rag: ['txt', 'md', 'markdown', 'pdf', 'json', 'log', 'rst'],
  storage: [],
  metrics: [],
  vision: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif'],
  multimodal: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'svg'],
  council: [],
  'apps-manager': [],
  volumes: [],
  archiver: [
    'zip',
    'tar',
    'gz',
    'tgz',
    'rar',
    '7z',
    'deb',
    'rpm',
    'cab',
    'jar',
    'war',
    'ear',
    'apk',
    'ipa',
    'whl',
    'xz',
    'bz2',
    'lzma',
    'zst',
    'cpio',
    'iso',
  ],
  player: [
    'mp3',
    'mp4',
    'webm',
    'wav',
    'ogg',
    'm4a',
    'flac',
    'aac',
    'mov',
    'm4v',
    'mkv',
    'avi',
    'wmv',
    'flv',
    'mpeg',
    'mpg',
    'opus',
    'wma',
    '3gp',
    'amr',
    'ts',
  ],
  remote: [],
  docs: [
    'txt',
    'md',
    'markdown',
    'log',
    'rst',
    'csv',
    'tsv',
    'json',
    'xml',
    'pdf',
    'rtf',
    'odt',
    'eml',
    'ics',
    'vcf',
    'nfo',
    'org',
  ],
  sheets: ['csv', 'tsv', 'xlsx', 'xls', 'ods', 'xlsm', 'numbers'],
  transfer: [],
  workflow: ['json', 'yaml', 'yml'],
  vectordb: [],
  resume: ['pdf', 'doc', 'docx', 'txt', 'md'],
  'time-machine': [],
  'void-ide': [
    'ts',
    'tsx',
    'js',
    'jsx',
    'mjs',
    'cjs',
    'json',
    'css',
    'scss',
    'less',
    'vue',
    'svelte',
    'py',
    'rs',
    'go',
    'java',
    'kt',
    'rb',
    'php',
    'cpp',
    'cc',
    'cxx',
    'c',
    'h',
    'hpp',
    'cs',
    'sql',
    'yaml',
    'yml',
    'toml',
    'xml',
    'sh',
    'bash',
    'zsh',
    'ps1',
    'dockerfile',
    'env',
    'gitignore',
    'pdf',
    'doc',
    'docx',
    'bat',
    'cmd',
    'lua',
    'swift',
    'dart',
    'r',
    'rmd',
    'scala',
    'clj',
    'tf',
    'hcl',
    'proto',
    'graphql',
    'gql',
    'ini',
    'cfg',
    'conf',
    'properties',
    'diff',
    'patch',
    'asm',
    'ex',
    'exs',
    'fs',
    'vb',
    'pl',
    'pm',
    'jinja',
    'j2',
    'liquid',
    'cmake',
    'gradle',
    'lock',
    'editorconfig',
    'nimignore',
    'zig',
    'nim',
  ],
  gmail: ['eml'],
  calendar: ['ics'],
  contacts: ['vcf'],
  drive: ['gdoc', 'gsheet', 'gslides'],
  todo: ['todo'],
  repo: [],
  viewer: [],
  roadrash: [],
  gemma: [],
  worldmap: [],
  datavideo: [],
  durgasman: [],
  sudoku: [],
  library: [],
  'dev-tool': [],
  'os-academy': [],
  'strace-inspector': [],
  'load-visualizer': [],
  'boot-simulator': [],
};

/** Built-in default handler when the user has not set an override. */
export const BUILTIN_DEFAULT_APP_BY_EXTENSION: Record<string, AppId> = {
  txt: 'docs',
  md: 'docs',
  markdown: 'docs',
  log: 'docs',
  rst: 'docs',
  pdf: 'browser',
  htm: 'browser',
  html: 'browser',
  xhtml: 'browser',
  rss: 'browser',
  atom: 'browser',
  mhtml: 'browser',
  webarchive: 'browser',
  epub: 'browser',
  zip: 'archiver',
  tar: 'archiver',
  gz: 'archiver',
  tgz: 'archiver',
  rar: 'archiver',
  '7z': 'archiver',
  deb: 'archiver',
  rpm: 'archiver',
  cab: 'archiver',
  jar: 'archiver',
  war: 'archiver',
  ear: 'archiver',
  apk: 'archiver',
  ipa: 'archiver',
  whl: 'archiver',
  xz: 'archiver',
  bz2: 'archiver',
  lzma: 'archiver',
  zst: 'archiver',
  cpio: 'archiver',
  iso: 'archiver',
  jpg: 'gallery',
  jpeg: 'gallery',
  png: 'gallery',
  gif: 'gallery',
  webp: 'gallery',
  svg: 'gallery',
  bmp: 'gallery',
  ico: 'gallery',
  avif: 'gallery',
  heic: 'gallery',
  tiff: 'gallery',
  tif: 'gallery',
  jxl: 'gallery',
  raw: 'gallery',
  cr2: 'gallery',
  nef: 'gallery',
  dng: 'gallery',
  psd: 'gallery',
  mp3: 'player',
  mp4: 'player',
  webm: 'player',
  wav: 'player',
  ogg: 'player',
  m4a: 'player',
  flac: 'player',
  aac: 'player',
  mov: 'player',
  m4v: 'player',
  mkv: 'player',
  avi: 'player',
  wmv: 'player',
  flv: 'player',
  mpeg: 'player',
  mpg: 'player',
  opus: 'player',
  wma: 'player',
  '3gp': 'player',
  amr: 'player',
  csv: 'sheets',
  tsv: 'sheets',
  xlsx: 'sheets',
  xls: 'sheets',
  ods: 'sheets',
  xlsm: 'sheets',
  numbers: 'sheets',
  doc: 'resume',
  docx: 'resume',
  rtf: 'docs',
  odt: 'docs',
  eml: 'docs',
  ics: 'docs',
  vcf: 'docs',
  nfo: 'docs',
  org: 'docs',
  tsx: 'void-ide',
  ts: 'void-ide',
  js: 'void-ide',
  jsx: 'void-ide',
  mjs: 'void-ide',
  cjs: 'void-ide',
  json: 'void-ide',
  css: 'void-ide',
  scss: 'void-ide',
  less: 'void-ide',
  vue: 'void-ide',
  svelte: 'void-ide',
  py: 'void-ide',
  rs: 'void-ide',
  go: 'void-ide',
  java: 'void-ide',
  kt: 'void-ide',
  rb: 'void-ide',
  php: 'void-ide',
  cpp: 'void-ide',
  cc: 'void-ide',
  cxx: 'void-ide',
  c: 'void-ide',
  h: 'void-ide',
  hpp: 'void-ide',
  cs: 'void-ide',
  sql: 'void-ide',
  yaml: 'void-ide',
  yml: 'void-ide',
  toml: 'void-ide',
  xml: 'void-ide',
  sh: 'void-ide',
  bash: 'void-ide',
  zsh: 'void-ide',
  ps1: 'void-ide',
  dockerfile: 'void-ide',
  env: 'void-ide',
  gitignore: 'void-ide',
  bat: 'void-ide',
  cmd: 'void-ide',
  lua: 'void-ide',
  swift: 'void-ide',
  dart: 'void-ide',
  r: 'void-ide',
  rmd: 'void-ide',
  scala: 'void-ide',
  clj: 'void-ide',
  tf: 'void-ide',
  hcl: 'void-ide',
  proto: 'void-ide',
  graphql: 'void-ide',
  gql: 'void-ide',
  ini: 'void-ide',
  cfg: 'void-ide',
  conf: 'void-ide',
  properties: 'void-ide',
  diff: 'void-ide',
  patch: 'void-ide',
  asm: 'void-ide',
  ex: 'void-ide',
  exs: 'void-ide',
  fs: 'void-ide',
  vb: 'void-ide',
  pl: 'void-ide',
  pm: 'void-ide',
  jinja: 'void-ide',
  j2: 'void-ide',
  liquid: 'void-ide',
  cmake: 'void-ide',
  gradle: 'void-ide',
  lock: 'void-ide',
  editorconfig: 'void-ide',
  nimignore: 'void-ide',
  zig: 'void-ide',
  nim: 'void-ide',
};

/** Apps tried in order when no specific mapping exists for an extension. */
export const FALLBACK_APP_CHAIN: readonly AppId[] = ['void-ide', 'docs', 'viewer'];

export function normalizeExtension(nameOrExt: string): string {
  const s = nameOrExt.trim().toLowerCase();
  if (!s) return '';
  return s.startsWith('.') ? s.slice(1) : s;
}

export function extensionFromFileName(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i < 0) return '';
  return normalizeExtension(fileName.slice(i + 1));
}

export function appSupportsExtension(appId: AppId, ext: string): boolean {
  const e = normalizeExtension(ext);
  if (!e) return false;
  if (appId === 'viewer') return true;
  const caps = APP_SUPPORTED_EXTENSIONS[appId];
  return caps ? caps.includes(e) : false;
}

export function getAppsSupportingExtension(ext: string): AppId[] {
  const e = normalizeExtension(ext);
  if (!e) return [];
  const out: AppId[] = [];
  for (const id of Object.keys(APPS) as AppId[]) {
    if (appSupportsExtension(id, e)) out.push(id);
  }
  return out;
}

export function getAllKnownExtensions(): string[] {
  const s = new Set<string>();
  for (const exts of Object.values(APP_SUPPORTED_EXTENSIONS)) {
    for (const x of exts) s.add(x);
  }
  return [...s].sort();
}

function appSupportsAndInstalled(
  appId: AppId,
  ext: string,
  installedIds: ReadonlySet<string>
): boolean {
  return installedIds.has(appId) && appSupportsExtension(appId, ext);
}

/** Resolve which app should open this extension (user prefs first, then built-in). */
export function resolveDefaultApp(
  ext: string,
  userAssociations: Readonly<Record<string, string>>,
  installedIds: ReadonlySet<string>
): AppId | null {
  const e = normalizeExtension(ext);
  if (!e) {
    if (installedIds.has('viewer')) return 'viewer';
    if (installedIds.has('docs')) return 'docs';
    if (installedIds.has('void-ide')) return 'void-ide';
    return null;
  }
  const preferred = userAssociations[e];
  if (preferred && appSupportsAndInstalled(preferred as AppId, e, installedIds)) {
    return preferred as AppId;
  }
  const builtin = BUILTIN_DEFAULT_APP_BY_EXTENSION[e];
  if (builtin && appSupportsAndInstalled(builtin, e, installedIds)) return builtin;
  const candidates = getAppsSupportingExtension(e).filter((id) => installedIds.has(id));
  if (candidates.length > 0) return candidates[0]!;

  for (const fb of FALLBACK_APP_CHAIN) {
    if (!installedIds.has(fb)) continue;
    if (fb === 'viewer') return fb;
    if (appSupportsExtension(fb, e)) return fb;
  }
  return null;
}

export function filterAssociationsToInstalled(
  map: Readonly<Record<string, string>>,
  installedIds: ReadonlySet<string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [ext, appId] of Object.entries(map)) {
    const e = normalizeExtension(ext);
    if (!e) continue;
    if (appSupportsAndInstalled(appId as AppId, e, installedIds)) out[e] = appId;
  }
  return out;
}
