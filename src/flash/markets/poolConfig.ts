import {
  PoolConfig,
  isVariant,
  type Side,
} from '@flash_trade/flash-sdk-v2';
import { DEFAULT_CLUSTER, DEFAULT_POOL_NAME, type Cluster } from '../constants';

// ---------------------------------------------------------------------------
// The pool registry — the source of truth for markets, tokens, and custodies.
//
// `PoolConfig.fromIdsByName` reads the SDK's bundled `PoolConfig.json`: it does
// NO network I/O, so everything in this `markets/` layer is synchronous and
// free. We memoize per (cluster, pool) since the config never changes at
// runtime, and every write instruction later needs the same object.
// ---------------------------------------------------------------------------

const cache = new Map<string, PoolConfig>();

/** Load a pool's config from the bundled registry (no network). Memoized. */
export function getPoolConfig(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName: string = DEFAULT_POOL_NAME
): PoolConfig {
  const key = `${cluster}:${poolName}`;
  let pc = cache.get(key);
  if (!pc) {
    pc = PoolConfig.fromIdsByName(poolName, cluster);
    cache.set(key, pc);
  }
  return pc;
}

/** 'long' | 'short' from the SDK's anchor-enum `Side` object. */
export function sideLabel(side: Side): 'long' | 'short' {
  return isVariant(side, 'long') ? 'long' : 'short';
}

/** Map a mint (base58) to its token symbol, using the pool's custodies. */
export function symbolByMint(pc: PoolConfig): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of pc.custodies) map.set(c.mintKey.toBase58(), c.symbol);
  return map;
}
