import { PublicKey } from '@solana/web3.js';
import { DEFAULT_CLUSTER, type Cluster } from '../constants';
import {
  assetClassOf,
  getAllPoolNames,
  getPoolConfig,
  sideLabel,
  symbolByMint,
  tickerByMint,
  type AssetClass,
} from './poolRegistry';

// Market metadata — normalized from the pool registry, no network. A "market"
// is one (target, side) pair, e.g. SOL Long. Flash splits markets across pools
// by asset class; `getAvailableMarkets()` with no pool name aggregates all of them.

export interface FlashMarket {
  /** Numeric market id within its pool. */
  marketId: number;
  /** The pool this market belongs to, e.g. "Crypto.1" or "Equity.1". */
  pool: string;
  /** Asset class, from the Pyth feed (Crypto / US Equity / Forex / Metals / …). */
  assetClass: AssetClass;
  /** UI name, e.g. "SOL Long". */
  name: string;
  /** Target asset symbol, e.g. "SOL". */
  targetSymbol: string;
  /** Collateral asset symbol, e.g. "SOL", "USDC", or "SPY". */
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

/** Markets in one pool, normalized. */
function marketsInPool(cluster: Cluster, poolName: string): FlashMarket[] {
  const pc = getPoolConfig(cluster, poolName);
  const symbols = symbolByMint(pc);
  const tickers = tickerByMint(pc);
  return pc.markets.map((m) => ({
    marketId: m.marketId,
    pool: poolName,
    assetClass: assetClassOf(tickers.get(m.targetMint.toBase58())),
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
 * Normalized markets. With a `poolName`, only that pool; otherwise every
 * non-deprecated pool for the cluster (Crypto.1 first). Pure — reads the
 * bundled registry only, no network.
 */
export function getAvailableMarkets(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName?: string
): FlashMarket[] {
  const pools = poolName ? [poolName] : getAllPoolNames(cluster);
  return pools.flatMap((name) => marketsInPool(cluster, name));
}
