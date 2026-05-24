/** Expected cancellation when the gateway hook unmounts or the user aborts. */
export class GatewayCancelledError extends Error {
  readonly cancelled = true;

  constructor(message: string) {
    super(message);
    this.name = 'GatewayCancelledError';
  }
}

const BENIGN_MESSAGES = new Set([
  'Unmounted',
  'Aborted',
  'Connection closed',
  'Connection timeout',
]);

export function isGatewayBenignError(err: unknown): boolean {
  if (err instanceof GatewayCancelledError) return true;
  if (!(err instanceof Error)) return false;
  return BENIGN_MESSAGES.has(err.message);
}
