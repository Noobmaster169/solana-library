import { PublicKey } from '@solana/web3.js';
import { DEFAULT_CLUSTER, DEFAULT_POOL_NAME, type Cluster } from '../constants';
import { getPoolConfig, sideLabel, symbolByMint } from './poolConfig';

// ---------------------------------------------------------------------------
// Market metadata — normalized from the pool registry, no network.
//
// A Flash "market" is one (target, side) pair, e.g. SOL Long. The tx layer
// addresses positions by `(targetSymbol, collateralSymbol, side)`, so we surface
// those symbols alongside the raw accounts/mints callers need.
// ---------------------------------------------------------------------------

export interface FlashMarket {
  /** Numeric market id within the pool. */
  marketId: number;
  /** UI name, e.g. "SOL Long". */
  name: string;
  /** Target asset symbol, e.g. "SOL". */
  targetSymbol: string;
  /** Collateral asset symbol, e.g. "SOL" or "USDC". */
  collateralSymbol: string;
  side: 'long' | 'short';
  /** Max leverage (non-degen) for this market. */
  maxLeverage: number;
  marketAccount: PublicKey;
  targetMint: PublicKey;
  collateralMint: PublicKey;
  targetCustody: PublicKey;
  collateralCustody: PublicKey;
}

/** Every market in a pool, normalized. Pure — reads the bundled registry only. */
export function getMarkets(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName: string = DEFAULT_POOL_NAME
): FlashMarket[] {
  const pc = getPoolConfig(cluster, poolName);
  const symbols = symbolByMint(pc);
  return pc.markets.map((m) => ({
    marketId: m.marketId,
    name: m.marketNameUi,
    targetSymbol: symbols.get(m.targetMint.toBase58()) ?? m.marketNameUi.split(' ')[0],
    collateralSymbol: symbols.get(m.collateralMint.toBase58()) ?? '',
    side: sideLabel(m.side),
    maxLeverage: m.maxLev,
    marketAccount: m.marketAccount,
    targetMint: m.targetMint,
    collateralMint: m.collateralMint,
    targetCustody: m.targetCustody,
    collateralCustody: m.collateralCustody,
  }));
}

/**
 * Resolve one market by target symbol + side (+ optional collateral symbol when
 * a target has multiple collateral variants). Throws if none matches — callers
 * should never hardcode the market account or collateral.
 */
export function resolveMarket(
  targetSymbol: string,
  side: 'long' | 'short',
  opts: { collateralSymbol?: string; cluster?: Cluster; poolName?: string } = {}
): FlashMarket {
  const target = targetSymbol.toUpperCase();
  const matches = getMarkets(opts.cluster, opts.poolName).filter(
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
