/** Google People API `connections[]` → display fields (shared Calendar + Contacts apps). */

export type PeopleConnectionView = {
  resourceName: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
};

export function parsePeopleConnection(
  c: Record<string, unknown>,
  index: number
): PeopleConnectionView | null {
  const resourceName = typeof c.resourceName === 'string' ? c.resourceName : `conn-${index}`;
  const names = c.names as Array<Record<string, unknown>> | undefined;
  const emails = c.emailAddresses as Array<Record<string, unknown>> | undefined;
  const photos = c.photos as Array<Record<string, unknown>> | undefined;

  const n0 = names?.[0];
  const display =
    n0 && typeof n0.displayName === 'string'
      ? n0.displayName
      : n0 && typeof n0.unstructuredName === 'string'
        ? String(n0.unstructuredName)
        : 'Unknown';

  const em0 = emails?.[0];
  const email = em0 && typeof em0.value === 'string' ? em0.value : '';

  const ph0 = photos?.[0];
  const photoUrl =
    ph0 && typeof ph0.url === 'string' && ph0.url.startsWith('http') ? ph0.url : null;

  return { resourceName, displayName: display, email, photoUrl };
}
