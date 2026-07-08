import { PublicKey } from '@solana/web3.js';
import { DEFAULT_CLUSTER, type Cluster } from '../constants';
import { assetClassOf, getAllPoolNames, getPoolConfig, type AssetClass } from './poolRegistry';

// The token registry — tradable/collateral tokens read from the pool registry,
// no network. Live USD prices live in getSupportedTokenPrices.

export interface FlashToken {
  symbol: string;
  fullName: string;
  mint: PublicKey;
  decimals: number;
  isStable: boolean;
  assetClass: AssetClass;
}

/**
 * Tradable/collateral tokens. With a `poolName`, only that pool; otherwise every
 * non-deprecated pool, deduped by mint. Pure — no network.
 */
export function getSupportedTokens(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName?: string
): FlashToken[] {
  const pools = poolName ? [poolName] : getAllPoolNames(cluster);
  const seen = new Map<string, FlashToken>();
  for (const name of pools) {
    for (const t of getPoolConfig(cluster, name).tokens) {
      const key = t.mintKey.toBase58();
      if (seen.has(key)) continue;
      seen.set(key, {
        symbol: t.symbol,
        fullName: t.fullName,
        mint: t.mintKey,
        decimals: t.decimals,
        isStable: t.isStable,
        assetClass: assetClassOf(t.pythTicker),
      });
    }
  }
  return [...seen.values()];
}
