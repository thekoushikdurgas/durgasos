/** Shared helpers for opening files from ai.backend object storage via GraphQL `storageGetUrl`. */

export type StorageRef = { bucket_type: string; file_path: string };

export type StorageUrlPayload = { success?: boolean; url?: string };

/** Apollo `useMutation` typing often widens `storageGetUrl` to `unknown`; keep this permissive. */
export type StorageGetUrlMutate = (options: {
  variables: { params: { bucket_type: string; file_path: string } };
}) => Promise<{ data?: { storageGetUrl?: unknown } | undefined } | undefined>;

export async function getStorageSignedUrl(
  getUrl: StorageGetUrlMutate,
  ref: StorageRef
): Promise<string | null> {
  const result = await getUrl({
    variables: { params: { bucket_type: ref.bucket_type, file_path: ref.file_path } },
  });
  const json = result?.data?.storageGetUrl as StorageUrlPayload | undefined;
  return json?.success && typeof json.url === 'string' && json.url.length > 0 ? json.url : null;
}

export async function fetchStorageBlob(
  getUrl: StorageGetUrlMutate,
  ref: StorageRef
): Promise<Blob | null> {
  const signed = await getStorageSignedUrl(getUrl, ref);
  if (!signed) return null;
  const res = await fetch(signed);
  if (!res.ok) return null;
  return res.blob();
}

export async function fetchStorageText(
  getUrl: StorageGetUrlMutate,
  ref: StorageRef
): Promise<string | null> {
  const signed = await getStorageSignedUrl(getUrl, ref);
  if (!signed) return null;
  const res = await fetch(signed);
  if (!res.ok) return null;
  return res.text();
}
