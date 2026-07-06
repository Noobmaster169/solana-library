import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/client';
import { getBasket } from './getBasket';
import { bnToNumber, marketByAccount, oraclePriceToNumber } from './helpers/derive';

// ---------------------------------------------------------------------------
// Normalized positions for a wallet.
//
// `getBasket` gives the raw decoded account; this turns its `positions` into
// flat, human-readable objects (symbols, USD, leverage) using market metadata
// already in memory — no extra RPC. PnL and liquidation price need oracle/pool
// math and live in the `views/` layer instead.
// ---------------------------------------------------------------------------

/** Position sizes/collateral are denominated in USD with 6 decimals on-chain. */
const USD_DECIMALS = 6;

export interface FlashPosition {
  /** On-chain market account this position belongs to. */
  market: PublicKey;
  /** UI market name, e.g. "SOL Long" (empty if the market isn't in the pool). */
  marketName: string;
  targetSymbol: string;
  collateralSymbol: string;
  side: 'long' | 'short';
  /** Position size in target-asset units. */
  sizeAmount: number;
  /** Position size in USD. */
  sizeUsd: number;
  /** Collateral backing the position, in USD. */
  collateralUsd: number;
  /** Average entry price (USD). */
  entryPrice: number;
  /** sizeUsd / collateralUsd. 0 when collateral is 0. */
  leverage: number;
  /** Position open time (unix seconds). */
  openTime: number;
}

/** Every active position for `owner`, normalized. Empty array if no basket. */
export async function getPositions(
  flash: FlashClient,
  owner: string | PublicKey,
  poolName?: string
): Promise<FlashPosition[]> {
  const basket = await getBasket(flash, owner);
  if (!basket) return [];

  const markets = marketByAccount(flash.cluster, poolName);
  const out: FlashPosition[] = [];

  for (const { position: p } of basket.positions) {
    if (!p.isActive) continue;
    const meta = markets.get(p.market.toBase58());
    const sizeUsd = bnToNumber(p.sizeUsd, USD_DECIMALS);
    const collateralUsd = bnToNumber(p.collateralUsd, USD_DECIMALS);
    out.push({
      market: p.market,
      marketName: meta?.name ?? '',
      targetSymbol: meta?.targetSymbol ?? '',
      collateralSymbol: meta?.collateralSymbol ?? '',
      side: meta?.side ?? 'long',
      sizeAmount: bnToNumber(p.sizeAmount, p.sizeDecimals),
      sizeUsd,
      collateralUsd,
      entryPrice: oraclePriceToNumber(p.entryPrice),
      leverage: collateralUsd > 0 ? sizeUsd / collateralUsd : 0,
      openTime: p.openTime,
    });
  }

  return out;
}
