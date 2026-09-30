// Pull a list out of an API response no matter how the backend wraps it.
//
// List endpoints here have returned data under several shapes over time and the
// backend has changed them without notice: a bare array, { data: [...] },
// { bookings: [...] }, and — once pagination was added — a nested
// { data: { docs: [...] } }. When a non-array reaches a caller's .map/.filter it
// throws and blanks the screen (Orders), or the list silently shows empty
// (Wallet transactions, redeem history). Normalising here keeps every caller
// working across all of these shapes.
//
// Strategy: return the payload if it's already an array; otherwise return the
// first array found under a known list key, checking the top level first and then
// one level inside the common wrapper keys (so { data: { docs: [...] } } works).
export function extractList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const listKeys = [
    'data', 'docs', 'bookings', 'orders', 'transactions',
    'history', 'results', 'items', 'list', 'requests',
  ];
  for (const key of listKeys) {
    if (Array.isArray(payload[key])) return payload[key] as T[];
  }

  // Nested one level deep, e.g. paginated { data: { docs: [...] } }.
  for (const key of ['data', 'result', 'payload', 'response']) {
    const inner = payload[key];
    if (inner && typeof inner === 'object') {
      const found = extractList<T>(inner);
      if (found.length) return found;
    }
  }

  return [];
}
