/**
 * A dependency-free, in-memory, single-value cache with a TTL.
 *
 * This is the deliberate replacement for the portfolio service's heavy
 * `unstorage`/Redis cache layer. The library's concern is querying, not
 * persistence — so the only caching primitive shipped here is the smallest one
 * that's broadly useful: memoize an expensive fetch and refresh it on expiry.
 *
 * Concurrent `get()` calls during a refresh share the same in-flight promise,
 * so a stampede triggers only one underlying fetch.
 */
export type TtlCache<T> = {
  /** Return the cached value, refetching if empty or expired. */
  get(): Promise<T>;
  /** Drop the cached value so the next `get()` refetches. */
  clear(): void;
};

export function createTtlCache<T>(
  fetch: () => Promise<T>,
  ttlMs = 60 * 60 * 1000
): TtlCache<T> {
  let value: T | undefined;
  let lastUpdate = 0;
  let inFlight: Promise<T> | undefined;

  return {
    async get(): Promise<T> {
      const now = Date.now();
      const fresh = value !== undefined && lastUpdate + ttlMs > now;
      if (fresh) return value as T;
      if (inFlight) return inFlight;

      inFlight = fetch()
        .then((result) => {
          value = result;
          lastUpdate = Date.now();
          return result;
        })
        .finally(() => {
          inFlight = undefined;
        });
      return inFlight;
    },
    clear(): void {
      value = undefined;
      lastUpdate = 0;
    },
  };
}
