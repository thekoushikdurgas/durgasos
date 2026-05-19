/**
 * Rewrite relative asset URLs in HTML loaded from object storage so subresources
 * resolve to signed HTTP URLs instead of invalid `blob:`-relative URLs.
 */

export type StorageHtmlRewriteStats = {
  /** Distinct storage keys we attempted to sign */
  storagePaths: number;
  /** Keys that received a signed URL */
  signedOk: number;
  /** Attributes we changed (href, src, srcset, …) */
  attributesUpdated: number;
  /** `<style>` blocks where `url(...)` was rewritten */
  styleBlocksUpdated: number;
  /** `<link rel=stylesheet>` from storage replaced with inlined `<style>` */
  stylesheetsInlined: number;
  /** Storage `<script src>` rewritten to same-origin `blob:` after fetch (reliable MIME + execution) */
  scriptsMaterialized: number;
};

function storageDirname(storageFilePath: string): string {
  const i = storageFilePath.lastIndexOf('/');
  if (i < 0) return '';
  return storageFilePath.slice(0, i);
}

function splitPathAndTail(ref: string): { pathOnly: string; tail: string } {
  let pathOnly = ref.trim();
  let tail = '';
  const hashIdx = pathOnly.indexOf('#');
  if (hashIdx >= 0) {
    tail = pathOnly.slice(hashIdx);
    pathOnly = pathOnly.slice(0, hashIdx);
  }
  const qIdx = pathOnly.indexOf('?');
  if (qIdx >= 0) {
    tail = pathOnly.slice(qIdx) + tail;
    pathOnly = pathOnly.slice(0, qIdx);
  }
  return { pathOnly, tail };
}

/**
 * Map `href`/`src`-style reference to a storage `file_path` in the same bucket as `htmlStoragePath`.
 */
export function resolveStorageRelativeToPath(
  htmlStoragePath: string,
  rawRef: string
): string | null {
  const ref = rawRef.trim();
  if (!ref || ref.startsWith('#')) return null;
  if (/^(https?:|data:|blob:|javascript:|mailto:|about:)/i.test(ref)) return null;
  if (ref.startsWith('//')) return null;

  const { pathOnly, tail } = splitPathAndTail(ref);
  if (!pathOnly) return null;

  const dir = storageDirname(htmlStoragePath);
  const dirParts = dir ? dir.split('/').filter(Boolean) : [];
  const refSegments = pathOnly.split('/');
  const fromBucketRoot = ref.startsWith('/');
  const stack: string[] = fromBucketRoot ? [] : [...dirParts];

  const start = fromBucketRoot && refSegments[0] === '' ? 1 : 0;
  for (let i = start; i < refSegments.length; i++) {
    const seg = refSegments[i]!;
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      stack.pop();
      continue;
    }
    stack.push(seg);
  }
  if (stack.length === 0) return null;
  return stack.join('/') + tail;
}

function cssEscapeForDoubleQuotedUrl(u: string): string {
  return u.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Best-effort `url(...)` argument extraction for `<style>` blocks (quoted or unquoted). */
export function extractCssUrlArguments(css: string): string[] {
  const out: string[] = [];
  const lower = css.toLowerCase();
  let i = 0;
  while (i < css.length) {
    const j = lower.indexOf('url(', i);
    if (j < 0) break;
    let k = j + 4;
    while (k < css.length && /\s/.test(css[k]!)) k++;
    if (k >= css.length) {
      i = j + 4;
      continue;
    }
    const q = css[k]!;
    let endParen = -1;
    let raw = '';
    if (q === '"' || q === "'") {
      const start = k + 1;
      const close = css.indexOf(q, start);
      if (close < 0) {
        i = j + 4;
        continue;
      }
      raw = css.slice(start, close);
      endParen = css.indexOf(')', close + 1);
    } else {
      endParen = css.indexOf(')', k);
      if (endParen < 0) {
        i = j + 4;
        continue;
      }
      raw = css.slice(k, endParen).trim();
    }
    if (raw && !/^data:/i.test(raw)) out.push(raw);
    i = endParen >= 0 ? endParen + 1 : j + 4;
  }
  return out;
}

function rewriteStyleBlockCss(
  css: string,
  htmlStoragePath: string,
  signedMap: Map<string, string>
): { next: string; changed: boolean } {
  let out = css;
  let changed = false;
  const uniq = [...new Set(extractCssUrlArguments(css))];
  for (const raw of uniq) {
    const sp = resolveStorageRelativeToPath(htmlStoragePath, raw);
    if (!sp) continue;
    const signed = signedMap.get(sp);
    if (!signed) continue;
    const esc = cssEscapeForDoubleQuotedUrl(signed);
    const replacement = `url("${esc}")`;
    const patterns = [`url("${raw}")`, `url('${raw}')`, `url(${raw})`];
    for (const pat of patterns) {
      if (out.includes(pat)) {
        out = out.split(pat).join(replacement);
        changed = true;
      }
    }
  }
  return { next: out, changed };
}

function rewriteSrcsetAttr(
  htmlStoragePath: string,
  srcset: string,
  signedMap: Map<string, string>
): { next: string; nSigned: number } | null {
  const parts = srcset.split(',');
  let nSigned = 0;
  let any = false;
  const out = parts.map((part) => {
    const t = part.trim();
    if (!t) return part;
    const m = t.match(/^(\S+)(\s.*)?$/);
    if (!m) return part;
    const urlTok = m[1]!;
    const rest = m[2] ?? '';
    const sp = resolveStorageRelativeToPath(htmlStoragePath, urlTok);
    if (!sp) return part;
    const signed = signedMap.get(sp);
    if (!signed) return part;
    any = true;
    nSigned++;
    return `${signed}${rest}`;
  });
  if (!any) return null;
  return { next: out.join(', '), nSigned };
}

function collectCssImportUrlsOrdered(css: string): string[] {
  const out: string[] = [];
  const re = /@import\s+(?:url\s*\(\s*)?(['"]?)([^'");]+?)\1\s*\)?[^;]*;/gi;
  let m;
  while ((m = re.exec(css))) {
    const u = m[2]?.trim();
    if (u) out.push(u);
  }
  return out;
}

function stripCssImportRules(css: string): string {
  return css.replace(/@import[^;]+;/gi, '');
}

async function bundleStorageCssCascade(
  rootPath: string,
  allSigned: Map<string, string>,
  cssCache: Map<string, string>,
  visiting: Set<string>,
  done: Set<string>
): Promise<string> {
  if (done.has(rootPath)) return '';
  if (visiting.has(rootPath)) return '';
  visiting.add(rootPath);
  const u = allSigned.get(rootPath);
  if (!u) {
    visiting.delete(rootPath);
    return '';
  }
  const cached = cssCache.get(rootPath);
  const text: string =
    cached ??
    (await (async () => {
      const t = await fetch(u).then((r) => r.text());
      cssCache.set(rootPath, t);
      return t;
    })());
  const imports = collectCssImportUrlsOrdered(text);
  const chunks: string[] = [];
  for (const raw of imports) {
    const sp = resolveStorageRelativeToPath(rootPath, raw);
    if (sp) chunks.push(await bundleStorageCssCascade(sp, allSigned, cssCache, visiting, done));
  }
  const stripped = stripCssImportRules(text);
  const rw = rewriteStyleBlockCss(stripped, rootPath, allSigned);
  chunks.push(rw.next);
  visiting.delete(rootPath);
  done.add(rootPath);
  return chunks.filter(Boolean).join('\n');
}

/**
 * Load storage-backed `<script src>` via signed URL and re-point to a `blob:` URL with a
 * JavaScript MIME type so the browser executes it (avoids `application/octet-stream` + nosniff).
 */
async function materializeStorageScripts(
  doc: Document,
  htmlStoragePath: string,
  signedMap: Map<string, string>,
  chunkSize: number
): Promise<number> {
  const scripts = [...doc.querySelectorAll('script[src]')];
  let n = 0;
  for (let i = 0; i < scripts.length; i += chunkSize) {
    const chunk = scripts.slice(i, i + chunkSize);
    const ok = await Promise.all(
      chunk.map(async (el) => {
        const raw = el.getAttribute('src');
        if (!raw) return false;
        const sp = resolveStorageRelativeToPath(htmlStoragePath, raw);
        if (!sp) return false;
        const u = signedMap.get(sp);
        if (!u) return false;
        try {
          const res = await fetch(u);
          if (!res.ok) return false;
          const text = await res.text();
          const isModule = el.getAttribute('type') === 'module';
          const key = (sp.split('?')[0] ?? sp).toLowerCase();
          const isMjs = key.endsWith('.mjs');
          const mime = isModule || isMjs ? 'text/javascript' : 'application/javascript';
          const blobUrl = URL.createObjectURL(new Blob([text], { type: mime }));
          el.setAttribute('src', blobUrl);
          return true;
        } catch {
          return false;
        }
      })
    );
    n += ok.filter(Boolean).length;
  }
  return n;
}

async function signPathsInChunks(
  paths: string[],
  getSignedUrlForPath: (filePath: string) => Promise<string | null>,
  chunkSize: number
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const pairs = await Promise.all(
      chunk.map(async (p) => [p, await getSignedUrlForPath(p)] as const)
    );
    for (const [p, u] of pairs) {
      if (u) map.set(p, u);
    }
  }
  return map;
}

/**
 * Parse HTML, rewrite relative `href`/`src`/`data` (and `srcset` first tokens) to signed URLs.
 */
export async function rewriteStorageHtmlAssets(options: {
  htmlText: string;
  htmlStoragePath: string;
  getSignedUrlForPath: (filePath: string) => Promise<string | null>;
  /** Max concurrent `getSignedUrlForPath` calls */
  signConcurrency?: number;
}): Promise<{ html: string; stats: StorageHtmlRewriteStats }> {
  const { htmlText, htmlStoragePath, getSignedUrlForPath, signConcurrency = 12 } = options;
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');

  const uniquePaths = new Set<string>();

  const consider = (raw: string | null) => {
    if (!raw) return;
    const sp = resolveStorageRelativeToPath(htmlStoragePath, raw);
    if (sp) uniquePaths.add(sp);
  };

  for (const el of doc.querySelectorAll('link[href]')) consider(el.getAttribute('href'));
  for (const el of doc.querySelectorAll('script[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('img[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('source[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('video[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('audio[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('embed[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('iframe[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('track[src]')) consider(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('object[data]')) consider(el.getAttribute('data'));
  for (const el of doc.querySelectorAll('form[action]')) consider(el.getAttribute('action'));

  for (const el of doc.querySelectorAll('img[srcset], source[srcset]')) {
    const val = el.getAttribute('srcset');
    if (!val) continue;
    for (const part of val.split(',')) {
      const t = part.trim();
      if (!t) continue;
      const m = t.match(/^(\S+)/);
      if (m) consider(m[1]!);
    }
  }

  for (const st of doc.querySelectorAll('style')) {
    const t = st.textContent ?? '';
    for (const u of extractCssUrlArguments(t)) consider(u);
  }

  type CssLinkMeta = { el: Element; path: string };
  const stylesheetEmbeds: CssLinkMeta[] = [];
  for (const el of doc.querySelectorAll('link[rel~="stylesheet"][href]')) {
    const raw = el.getAttribute('href');
    if (!raw) continue;
    const sp = resolveStorageRelativeToPath(htmlStoragePath, raw);
    if (!sp) continue;
    const baseKey = sp.split('?')[0] ?? sp;
    if (!/\.css$/i.test(baseKey)) continue;
    stylesheetEmbeds.push({ el, path: sp });
  }

  const embedPathSet = new Set(stylesheetEmbeds.map((x) => x.path));
  const pathsNeeded = new Set(uniquePaths);
  const allSigned = new Map<string, string>();
  const cssFetchedText = new Map<string, string>();
  const expandedCss = new Set<string>();

  for (let round = 0; round < 8; round++) {
    const toSign = [...pathsNeeded].filter((p) => !allSigned.has(p));
    if (toSign.length) {
      const batch = await signPathsInChunks(toSign, getSignedUrlForPath, signConcurrency);
      for (const [k, v] of batch) allSigned.set(k, v);
    }

    let grew = false;
    for (const p of [...pathsNeeded]) {
      const key = p.split('?')[0] ?? p;
      if (!/\.css$/i.test(key)) continue;
      if (!allSigned.has(p)) continue;
      if (expandedCss.has(p)) continue;
      expandedCss.add(p);
      const cachedBody = cssFetchedText.get(p);
      let body: string;
      if (cachedBody) {
        body = cachedBody;
      } else {
        const su = allSigned.get(p)!;
        try {
          body = await fetch(su).then((r) => r.text());
          cssFetchedText.set(p, body);
        } catch {
          expandedCss.delete(p);
          continue;
        }
      }
      for (const raw of extractCssUrlArguments(body)) {
        const rp = resolveStorageRelativeToPath(p, raw);
        if (rp && !pathsNeeded.has(rp)) {
          pathsNeeded.add(rp);
          grew = true;
        }
      }
      for (const raw of collectCssImportUrlsOrdered(body)) {
        const rp = resolveStorageRelativeToPath(p, raw);
        if (rp && !pathsNeeded.has(rp)) {
          pathsNeeded.add(rp);
          grew = true;
        }
      }
    }
    if (!toSign.length && !grew) break;
  }

  const signedMap = allSigned;
  const signedOk = signedMap.size;
  const paths = [...pathsNeeded];

  let attributesUpdated = 0;
  const scriptsMaterialized = await materializeStorageScripts(
    doc,
    htmlStoragePath,
    signedMap,
    signConcurrency
  );
  attributesUpdated += scriptsMaterialized;

  const applySingle = (el: Element, attr: string) => {
    const raw = el.getAttribute(attr);
    if (!raw) return;
    const sp = resolveStorageRelativeToPath(htmlStoragePath, raw);
    if (!sp) return;
    if (attr === 'href' && el.tagName === 'LINK' && embedPathSet.has(sp)) return;
    const url = signedMap.get(sp);
    if (!url) return;
    el.setAttribute(attr, url);
    attributesUpdated++;
  };

  for (const el of doc.querySelectorAll('link[href]')) applySingle(el, 'href');
  for (const el of doc.querySelectorAll('script[src]')) {
    const raw = el.getAttribute('src');
    if (raw?.startsWith('blob:')) continue;
    applySingle(el, 'src');
  }
  for (const el of doc.querySelectorAll('img[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('source[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('video[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('audio[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('embed[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('iframe[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('track[src]')) applySingle(el, 'src');
  for (const el of doc.querySelectorAll('object[data]')) applySingle(el, 'data');
  for (const el of doc.querySelectorAll('form[action]')) applySingle(el, 'action');

  for (const el of doc.querySelectorAll('img[srcset], source[srcset]')) {
    const raw = el.getAttribute('srcset');
    if (!raw) continue;
    const rw = rewriteSrcsetAttr(htmlStoragePath, raw, signedMap);
    if (!rw) continue;
    el.setAttribute('srcset', rw.next);
    attributesUpdated++;
  }

  let styleBlocksUpdated = 0;
  for (const st of doc.querySelectorAll('style')) {
    const t = st.textContent ?? '';
    const rw = rewriteStyleBlockCss(t, htmlStoragePath, signedMap);
    if (!rw.changed) continue;
    st.textContent = rw.next;
    styleBlocksUpdated++;
  }

  let stylesheetsInlined = 0;
  for (const { el, path } of stylesheetEmbeds) {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const bundled = await bundleStorageCssCascade(path, signedMap, cssFetchedText, visiting, done);
    if (!bundled.trim()) {
      const fallback = signedMap.get(path);
      if (fallback) el.setAttribute('href', fallback);
      continue;
    }
    const style = doc.createElement('style');
    style.setAttribute('data-durgasos-inlined-css-from', path);
    style.textContent = bundled;
    el.parentNode?.insertBefore(style, el);
    el.remove();
    stylesheetsInlined++;
  }

  const stats: StorageHtmlRewriteStats = {
    storagePaths: paths.length,
    signedOk,
    attributesUpdated,
    styleBlocksUpdated,
    stylesheetsInlined,
    scriptsMaterialized,
  };
  const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  return { html, stats };
}
