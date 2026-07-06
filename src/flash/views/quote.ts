import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { USD_DECIMALS } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { bnToNumber, oraclePriceToNumber, toPublicKey } from '../accounts/helpers/derive';
import { resolveTrade, toTokenAmount, toUsdAmount } from '../tx/common';
import type { ViewResult } from './types';

// ---------------------------------------------------------------------------
// Pre-trade quotes — simulated on-chain so fees, entry, and liquidation price
// match what an actual open/close would produce. These wrap the SDK's `views.*`
// (read-only ER simulation) and normalize the headline numbers; `.raw` keeps
// the full decoded result. Market/lock resolution matches the tx builders.
// ---------------------------------------------------------------------------

const LEVERAGE_SCALE = 10_000; // BPS_POWER: 2x → 20000

export interface OpenPositionQuote {
  /** Average entry price (USD). */
  entryPrice: number;
  /** Estimated liquidation price (USD). */
  liquidationPrice: number;
  /** Resulting position size in USD and target-asset units. */
  sizeUsd: number;
  sizeAmount: number;
  /** Collateral value after fees, in USD. */
  collateralUsd: number;
  /** Total open fee, in USD. */
  totalFeeUsd: number;
  /** Effective leverage (e.g. 2.0). */
  leverage: number;
  /** Liquidity available to take the position, in USD. */
  availableLiquidityUsd: number;
  /** Whether the funding asset must be swapped into the market's lock asset. */
  swapRequired: boolean;
  /** The full SDK-decoded quote (BN/OraclePrice fields intact). */
  raw: ViewResult;
}

export interface OpenPositionQuoteParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Collateral amount to commit, in whole tokens of the funding asset. */
  amountIn: number;
  /** Target leverage, e.g. 2 for 2x. */
  leverage: number;
  /** Funding asset; defaults to the market's collateral asset. */
  collateralSymbol?: string;
  poolName?: string;
}

/** Quote opening a position: fees, entry, liquidation, and resulting size. */
export async function getOpenPositionQuote(
  flash: FlashClient,
  params: OpenPositionQuoteParams
): Promise<OpenPositionQuote> {
  const t = resolveTrade(flash, params);
  const amountIn = toTokenAmount(params.amountIn, t.fundingDecimals);
  const leverage = new BN(Math.round(params.leverage * LEVERAGE_SCALE));

  const q: ViewResult = await t.sdk.views.getOpenPositionQuote(t.pc, {
    market: t.marketAccount,
    targetSymbol: t.targetSymbol,
    collateralSymbol: t.lockSymbol,
    receivingSymbol: t.fundingSymbol,
    amountIn,
    leverage,
  });

  return {
    entryPrice: oraclePriceToNumber(q['entryPrice']),
    liquidationPrice: oraclePriceToNumber(q['liquidationPrice']),
    sizeUsd: bnToNumber(q['sizeUsd'], USD_DECIMALS),
    sizeAmount: bnToNumber(q['sizeAmount'], t.targetDecimals),
    collateralUsd: bnToNumber(q['collateralUsd'], USD_DECIMALS),
    totalFeeUsd: bnToNumber(q['totalFeeUsd'], USD_DECIMALS),
    leverage: bnToNumber(q['leverage'], 4),
    availableLiquidityUsd: bnToNumber(q['availableLiquidityUsd'], USD_DECIMALS),
    swapRequired: Boolean(q['swapRequired']),
    raw: q,
  };
}

export interface ClosePositionQuoteParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Portion of the position to close, in USD. */
  sizeDeltaUsd: number;
  collateralSymbol?: string;
  /** Asset paid out; defaults to the market's collateral (lock) asset. */
  dispensingSymbol?: string;
  poolName?: string;
}

/**
 * Quote closing (all or part of) a position. Returns the raw SDK result — the
 * owner must have an open position in the market or the simulation reverts.
 */
export async function getClosePositionQuote(
  flash: FlashClient,
  owner: string | PublicKey,
  params: ClosePositionQuoteParams
): Promise<ViewResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.views.getClosePositionQuote(t.pc, {
    owner: toPublicKey(owner),
    market: t.marketAccount,
    targetSymbol: t.targetSymbol,
    collateralSymbol: t.lockSymbol,
    dispensingSymbol: params.dispensingSymbol ?? t.lockSymbol,
    sizeDeltaUsd: toUsdAmount(params.sizeDeltaUsd),
  });
}
