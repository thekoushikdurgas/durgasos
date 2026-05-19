/** Gmail folder → search `q` fragment (combined with user search in the UI). */

export type GmailFolderId = 'inbox' | 'starred' | 'sent' | 'drafts' | 'trash';

export const GMAIL_FOLDER_Q: Record<GmailFolderId, string> = {
  inbox: 'in:inbox',
  starred: 'is:starred',
  sent: 'in:sent',
  drafts: 'in:drafts',
  trash: 'in:trash',
};

export function buildGmailListQuery(folder: GmailFolderId, search: string): string {
  const base = GMAIL_FOLDER_Q[folder];
  const s = search.trim();
  if (!s) return base;
  return `${base} ${s}`;
}

/** Read a MIME header value from Gmail `payload.headers` (metadata format). */
export function getGmailHeader(headers: unknown, name: string): string {
  if (!Array.isArray(headers)) return '';
  const lower = name.toLowerCase();
  for (const row of headers) {
    if (!row || typeof row !== 'object') continue;
    const o = row as { name?: unknown; value?: unknown };
    if (typeof o.name !== 'string' || typeof o.value !== 'string') continue;
    if (o.name.toLowerCase() === lower) return o.value;
  }
  return '';
}

/** Parse a RFC5322 From line into display name + email. */
export function parseFromLine(from: string): { display: string; email: string | null } {
  const trimmed = from.trim();
  if (!trimmed) return { display: '(unknown)', email: null };
  const lt = trimmed.lastIndexOf('<');
  const gt = trimmed.lastIndexOf('>');
  if (lt !== -1 && gt > lt) {
    const email = trimmed.slice(lt + 1, gt).trim();
    const name = trimmed
      .slice(0, lt)
      .trim()
      .replace(/^"+|"+$/g, '')
      .replace(/^'+|'+$/g, '');
    return { display: name || email, email: email || null };
  }
  if (/[^\s@]+@[^\s@]+/.test(trimmed)) {
    return { display: trimmed, email: trimmed };
  }
  return { display: trimmed, email: null };
}

/** Short relative label for list rows (Gmail internalDate is ms string). */
export function formatGmailRelativeTime(internalDate?: string | number | null): string {
  if (internalDate == null || internalDate === '') return '';
  const ms = typeof internalDate === 'string' ? Number(internalDate) : internalDate;
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return 'Now';
  if (diff < 86_400_000) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (diff < 7 * 86_400_000) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function gmailLabelIdsUnread(labelIds: unknown): boolean {
  if (!Array.isArray(labelIds)) return false;
  return labelIds.some((x) => x === 'UNREAD');
}

/** Prefer the latest message in a thread by `internalDate` (Gmail string ms). */
export function pickLatestThreadMessage(
  thread: { messages?: unknown[] } | null | undefined
): Record<string, unknown> | null {
  const msgs = thread?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  let best: Record<string, unknown> | null = null;
  let bestT = -1;
  for (const m of msgs) {
    if (!m || typeof m !== 'object') continue;
    const o = m as Record<string, unknown>;
    if (typeof o.id !== 'string') continue;
    const raw = o.internalDate;
    const t = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : 0;
    const n = Number.isFinite(t) ? t : 0;
    if (n >= bestT) {
      bestT = n;
      best = o;
    }
  }
  if (best) return best;
  const last = msgs[msgs.length - 1];
  if (last && typeof last === 'object') return last as Record<string, unknown>;
  return null;
}

export type GmailReaderFields = {
  subject: string;
  fromLine: string;
  fromDisplay: string;
  fromEmail: string | null;
  toLine: string;
  dateLine: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
};

export function parseMessageForReader(
  msg: Record<string, unknown> | null
): GmailReaderFields | null {
  if (!msg) return null;
  const payload = msg.payload;
  const headers =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).headers
      : undefined;
  const subject = getGmailHeader(headers, 'Subject') || '(no subject)';
  const fromLine = getGmailHeader(headers, 'From') || '';
  const toLine = getGmailHeader(headers, 'To') || '';
  const dateLine =
    getGmailHeader(headers, 'Date') ||
    (typeof msg.internalDate === 'string'
      ? new Date(Number(msg.internalDate)).toLocaleString()
      : '');
  const snippet = typeof msg.snippet === 'string' ? msg.snippet : '';
  const labelIds = msg.labelIds;
  const ids = Array.isArray(labelIds) ? labelIds : [];
  const unread = ids.includes('UNREAD');
  const starred = ids.includes('STARRED');
  const important = ids.includes('IMPORTANT');
  const { display, email } = parseFromLine(fromLine);
  return {
    subject,
    fromLine,
    fromDisplay: display,
    fromEmail: email,
    toLine,
    dateLine,
    snippet,
    unread,
    starred,
    important,
  };
}

/** Open Gmail web for this thread (best-effort; auth user may differ). */
export function gmailWebThreadUrl(threadId: string): string {
  const id = encodeURIComponent(threadId);
  return `https://mail.google.com/mail/u/0/#inbox/${id}`;
}
