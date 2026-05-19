/** Short labels for Settings UI from stored `scopesGranted`. */
export function googleScopeBadgeLabels(scopesGranted: string | null | undefined): string[] {
  const raw = (scopesGranted ?? '').trim();
  if (!raw) return [];
  const labels: string[] = [];
  for (const part of raw.split(/\s+/)) {
    if (!part) continue;
    const suf = part.split('/').pop() ?? part;
    const base = suf.replace('.readonly', '');
    const key = base.includes('.') ? (base.split('.').pop() ?? base) : base;
    const map: Record<string, string> = {
      photoslibrary: 'Photos',
      gmail: 'Gmail',
      calendar: 'Calendar',
      contacts: 'Contacts',
      drive: 'Drive',
      tasks: 'Tasks',
    };
    const label = map[key] ?? key;
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}
