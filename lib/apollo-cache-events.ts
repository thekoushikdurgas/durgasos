/** Dispatched after logout so Apollo InMemoryCache can be wiped (persisted layer too). */
export const CLEAR_APOLLO_CACHE_EVENT = 'durgasos-clear-apollo-cache';

export function notifyClearApolloCache(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CLEAR_APOLLO_CACHE_EVENT));
}
