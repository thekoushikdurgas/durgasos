export function formatMutationFailure(err: {
  message: string;
  graphQLErrors?: readonly { message: string }[];
}): string {
  const gqlMsg = err.graphQLErrors
    ?.map((e) => e.message)
    .filter(Boolean)
    .join('; ');
  return gqlMsg || err.message;
}
