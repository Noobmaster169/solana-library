import type { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { createKeyedTtlCache } from '@solana';

// ---------------------------------------------------------------------------
// Scoped DLMM pool cache.
//
// The zap-sdk's helpers are stateless — `estimateDlmm*Swap`, `getZapIn*Params`,
// and `buildZapInDlmmTransaction` each call `DLMM.create` internally, so a single
// open/close re-hydrates the same pool 4-6 times (~4 RPC each). We can't inject a
// shared instance (the functions don't accept one), so we intercept `DLMM.create`
// and serve it from a keyed TTL cache instead.
//
// Two safety properties matter because this ships in a *library*:
//
//   1. The interceptor only consults the cache while a `withDlmmCache` scope is
//      active (a depth counter our own helpers set). Outside our helpers it is a
//      pure passthrough, so a consumer's own `DLMM.create` is never memoized.
//   2. A short TTL keeps `activeId`/reserves fresh on the write path: within one
//      operation everything shares one snapshot; a burst of operations reuses the
//      pool; nothing stale enough to matter survives.
//
// npm dedupes @meteora-ag/dlmm to one copy, so patching this class also reaches
// the SDK's internal calls.
// ---------------------------------------------------------------------------

/** Default cache lifetime — short, because these are write-path hydrations. */
const POOL_TTL_MS = 30_000;

type CreateFn = (
  connection: Connection,
  dlmm: PublicKey,
  opt?: Parameters<typeof DLMM.create>[2]
) => Promise<DLMM>;

const originalCreate = DLMM.create.bind(DLMM) as CreateFn;

// createKeyedTtlCache's fetch receives only the string key, so stash the
// (connection, lbPair) each getPool is about to fetch and read it back here.
// cluster/programId in `opt` are pool-invariant, so key only on endpoint + pool.
// The cache holds the in-flight Promise, so concurrent creates of one pool share
// a single fetch.
const pending = new Map<string, [Connection, PublicKey]>();

const cache = createKeyedTtlCache<DLMM>((key) => {
  const args = pending.get(key);
  if (!args) throw new Error(`pool cache: no connection registered for ${key}`);
  return originalCreate(args[0], args[1]);
}, POOL_TTL_MS);

let depth = 0;

const keyOf = (connection: Connection, lbPair: PublicKey): string =>
  `${connection.rpcEndpoint}:${lbPair.toBase58()}`;

/** Get a hydrated pool from the cache (used by our own tx code). */
export function getPool(connection: Connection, lbPair: PublicKey): Promise<DLMM> {
  const key = keyOf(connection, lbPair);
  pending.set(key, [connection, lbPair]);
  return cache.get(key).finally(() => pending.delete(key));
}

(DLMM as unknown as { create: CreateFn }).create = function cachedCreate(
  connection,
  lbPair,
  opt
) {
  // Passthrough when no operation scope is active (protects library consumers).
  if (depth === 0) return originalCreate(connection, lbPair, opt);
  return getPool(connection, lbPair);
};

/**
 * Run `fn` with `DLMM.create` served from the pool cache for the call's
 * duration. Nested scopes are counted; the interceptor stays a passthrough once
 * the outermost scope exits. Wrap each write helper's body in this.
 */
export async function withDlmmCache<T>(fn: () => Promise<T>): Promise<T> {
  depth += 1;
  try {
    return await fn();
  } finally {
    depth -= 1;
  }
}
