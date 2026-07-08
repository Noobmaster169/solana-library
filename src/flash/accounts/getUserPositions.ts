import { PublicKey } from '@solana/web3.js';
import { USD_DECIMALS } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { getUserBasket } from './getUserBasket';
import { bnToNumber, marketByAccount, oraclePriceToNumber } from './helpers/pdaAndDecode';

// Normalized positions for a wallet: turns the raw Basket into flat, human-
// readable objects using in-memory market metadata (no extra RPC). PnL and
// liquidation price need oracle math and live in `views/`.

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
export async function getUserPositions(
  flash: FlashClient,
  owner: string | PublicKey,
  poolName?: string
): Promise<FlashPosition[]> {
  const basket = await getUserBasket(flash, owner);
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
