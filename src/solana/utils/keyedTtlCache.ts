/**
 * A dependency-free, in-memory, per-key cache with a TTL.
 *
 * The keyed generalization of `createTtlCache`: one entry per string key, each
 * with its own expiry and single-flight in-flight promise — a stampede on the
 * same key triggers only one underlying fetch, while different keys fetch in
 * parallel. Entry count is bounded: when `maxEntries` is exceeded the least
 * recently used keys are evicted.
 */
export type KeyedTtlCache<V> = {
  /** Return the cached value for `key`, refetching if empty or expired. */
  get(key: string): Promise<V>;
  /** Drop one key (or every key when omitted) so the next `get()` refetches. */
  invalidate(key?: string): void;
};

type Entry<V> = {
  value?: V;
  lastUpdate: number;
  inFlight?: Promise<V>;
};

export function createKeyedTtlCache<V>(
  fetch: (key: string) => Promise<V>,
  ttlMs = 60 * 60 * 1000,
  opts?: { maxEntries?: number }
): KeyedTtlCache<V> {
  const maxEntries = opts?.maxEntries ?? 1000;
  // Map preserves insertion order — delete+set moves a key to the end, so the
  // oldest (least recently touched) keys sit at the front and evict first.
  const entries = new Map<string, Entry<V>>();

  function touch(key: string, entry: Entry<V>): void {
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  return {
    async get(key: string): Promise<V> {
      const now = Date.now();
      const existing = entries.get(key);

      if (existing) {
        const fresh =
          existing.value !== undefined && existing.lastUpdate + ttlMs > now;
        if (fresh) {
          touch(key, existing);
          return existing.value as V;
        }
        if (existing.inFlight) return existing.inFlight;
      }

      const entry: Entry<V> = existing ?? { lastUpdate: 0 };
      entry.inFlight = fetch(key)
        .then((result) => {
          entry.value = result;
          entry.lastUpdate = Date.now();
          return result;
        })
        .finally(() => {
          entry.inFlight = undefined;
        });
      touch(key, entry);
      return entry.inFlight;
    },
    invalidate(key?: string): void {
      if (key === undefined) entries.clear();
      else entries.delete(key);
    },
  };
}
