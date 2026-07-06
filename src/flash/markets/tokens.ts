import { PublicKey } from '@solana/web3.js';
import type { JupiterClient } from '@jupiter';
import { getPricesAsMap } from '@jupiter';
import { DEFAULT_CLUSTER, DEFAULT_POOL_NAME, type Cluster } from '../constants';
import { getPoolConfig } from './poolConfig';

// ---------------------------------------------------------------------------
// Token registry + USD prices.
//
// Token metadata is read from the pool registry (no network). USD prices reuse
// the library's Jupiter client rather than any Flash oracle/REST call — Flash's
// tradable assets are standard SPL mints, so this stays SDK-free and RPC-free.
// ---------------------------------------------------------------------------

export interface FlashToken {
  symbol: string;
  fullName: string;
  mint: PublicKey;
  decimals: number;
  isStable: boolean;
}

/** Every tradable/collateral token in a pool, normalized. Pure — no network. */
export function getTokens(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName: string = DEFAULT_POOL_NAME
): FlashToken[] {
  const pc = getPoolConfig(cluster, poolName);
  return pc.tokens.map((t) => ({
    symbol: t.symbol,
    fullName: t.fullName,
    mint: t.mintKey,
    decimals: t.decimals,
    isStable: t.isStable,
  }));
}

/** A token with its current USD price attached (null when Jupiter can't price it). */
export interface TokenWithPrice extends FlashToken {
  usdPrice: number | null;
}

/**
 * The pool's tokens with live USD prices from Jupiter, in one batched call.
 * Stablecoins with no Jupiter quote fall back to 1.0.
 */
export async function getTokenPrices(
  jupiter: JupiterClient,
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName: string = DEFAULT_POOL_NAME
): Promise<TokenWithPrice[]> {
  const tokens = getTokens(cluster, poolName);
  const prices = await getPricesAsMap(
    jupiter,
    tokens.map((t) => t.mint.toBase58())
  );
  return tokens.map((t) => {
    const quoted = prices.get(t.mint.toBase58())?.usdPrice ?? null;
    return { ...t, usdPrice: quoted ?? (t.isStable ? 1 : null) };
  });
}
