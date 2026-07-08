import type { JupiterClient } from '@jupiter';
import { getPricesAsMap } from '@jupiter';
import { DEFAULT_CLUSTER, type Cluster } from '../constants';
import { getSupportedTokens, type FlashToken } from './getSupportedTokens';

// The token registry with live USD prices from Jupiter — Flash's tradable
// assets are standard SPL mints, so no Flash oracle/REST call is needed.

/** A token with its current USD price attached (null when Jupiter can't price it). */
export interface TokenWithPrice extends FlashToken {
  usdPrice: number | null;
}

/**
 * The pool's tokens with live USD prices from Jupiter, in one batched call.
 * Stablecoins with no Jupiter quote fall back to 1.0.
 */
export async function getSupportedTokenPrices(
  jupiter: JupiterClient,
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName?: string
): Promise<TokenWithPrice[]> {
  const tokens = getSupportedTokens(cluster, poolName);
  const prices = await getPricesAsMap(
    jupiter,
    tokens.map((t) => t.mint.toBase58())
  );
  return tokens.map((t) => {
    const quoted = prices.get(t.mint.toBase58())?.usdPrice ?? null;
    return { ...t, usdPrice: quoted ?? (t.isStable ? 1 : null) };
  });
}
