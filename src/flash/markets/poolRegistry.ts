import {
  PoolConfig,
  PoolConfigJson,
  isVariant,
  type Side,
} from '@flash_trade/flash-sdk-v2';
import { DEFAULT_CLUSTER, DEFAULT_POOL_NAME, type Cluster } from '../constants';

// Pool-registry access + the small helpers that normalize it. `PoolConfig` reads
// the SDK's bundled JSON with no network I/O; the core read functions
// (getAvailableMarkets / getSupportedTokens / …) build on these.

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

/**
 * Every non-empty, non-deprecated pool name for a cluster, in registry order
 * (Crypto.1 first). Flash splits its markets across pools by asset class, so
 * discovery aggregates across all of them.
 */
export function getAllPoolNames(cluster: Cluster = DEFAULT_CLUSTER): string[] {
  return PoolConfigJson.pools
    .filter(
      (p) => p.cluster === cluster && !p.isDeprecated && (p.markets?.length ?? 0) > 0
    )
    .map((p) => p.poolName);
}

/** The asset class of a market or token. */
export type AssetClass =
  | 'Crypto'
  | 'US Equity'
  | 'Forex'
  | 'Metals'
  | 'Commodities'
  | 'Other';

/** Classify an asset by its `pythTicker` prefix (e.g. `Equity.US.AAPL/USD`). */
export function assetClassOf(pythTicker = ''): AssetClass {
  if (pythTicker.startsWith('Equity')) return 'US Equity';
  if (pythTicker.startsWith('FX')) return 'Forex';
  if (pythTicker.startsWith('Metal')) return 'Metals';
  if (pythTicker.startsWith('Commodities')) return 'Commodities';
  if (pythTicker.startsWith('Crypto')) return 'Crypto';
  return 'Other';
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

/** Map a mint (base58) to its Pyth ticker, using the pool's tokens. */
export function tickerByMint(pc: PoolConfig): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of pc.tokens) map.set(t.mintKey.toBase58(), t.pythTicker);
  return map;
}
