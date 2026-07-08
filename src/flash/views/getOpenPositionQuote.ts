import { USD_DECIMALS } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { bnToNumber, oraclePriceToNumber } from '../accounts/helpers/pdaAndDecode';
import {
  resolveTrade,
  simulateOpenQuote,
  toLeverageBN,
  toTokenAmount,
  type OpenQuoteResult,
} from '../tx/tradeResolution';

// Quote opening a position — a read-only ER simulation that wraps the SDK's
// `views.getOpenPositionQuote` and normalizes the headline numbers; `raw` keeps
// the full decoded result. Market and lock resolution match the tx builders.

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
  raw: OpenQuoteResult;
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
  const q = await simulateOpenQuote(t, amountIn, toLeverageBN(params.leverage));

  return {
    entryPrice: oraclePriceToNumber(q.entryPrice),
    liquidationPrice: oraclePriceToNumber(q.liquidationPrice),
    sizeUsd: bnToNumber(q.sizeUsd, USD_DECIMALS),
    sizeAmount: bnToNumber(q.sizeAmount, t.targetDecimals),
    collateralUsd: bnToNumber(q.collateralUsd, USD_DECIMALS),
    totalFeeUsd: bnToNumber(q.totalFeeUsd, USD_DECIMALS),
    leverage: bnToNumber(q.leverage, 4),
    availableLiquidityUsd: bnToNumber(q.availableLiquidityUsd, USD_DECIMALS),
    swapRequired: Boolean(q.swapRequired),
    raw: q,
  };
}
