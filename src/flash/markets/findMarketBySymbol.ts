import type { Cluster } from '../constants';
import { getAvailableMarkets, type FlashMarket } from './getAvailableMarkets';

// Resolve one market by target symbol + side, so callers never hardcode a
// market account or collateral.

/**
 * Resolve one market by target symbol + side, searching every pool (or just
 * `opts.poolName` if given). Optionally disambiguate by collateral symbol.
 * Throws if none matches.
 */
export function findMarketBySymbol(
  targetSymbol: string,
  side: 'long' | 'short',
  opts: { collateralSymbol?: string; cluster?: Cluster; poolName?: string } = {}
): FlashMarket {
  const target = targetSymbol.toUpperCase();
  const matches = getAvailableMarkets(opts.cluster, opts.poolName).filter(
    (m) => m.targetSymbol.toUpperCase() === target && m.side === side
  );
  const market = opts.collateralSymbol
    ? matches.find(
        (m) => m.collateralSymbol.toUpperCase() === opts.collateralSymbol!.toUpperCase()
      )
    : matches[0];
  if (!market) {
    throw new Error(
      `no Flash market for ${targetSymbol} ${side}` +
        (opts.collateralSymbol ? ` with ${opts.collateralSymbol} collateral` : '')
    );
  }
  return market;
}
