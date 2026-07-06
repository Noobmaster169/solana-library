import { BN } from '@coral-xyz/anchor';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import type { ViewResult } from '../views/types';
import { resolveTrade, toTokenAmount } from './common';

// ---------------------------------------------------------------------------
// Open a position.
//
// Flash's openPosition needs a concrete `sizeAmount` and a slippage-bounded
// entry price, not a leverage number — so the builder first simulates a quote
// (same math the trade will use) to derive size and the mark price, applies
// slippage via the SDK, then builds the UNSIGNED instruction. The market and
// its lock custody are resolved by `resolveTrade`, never hardcoded.
// ---------------------------------------------------------------------------

const LEVERAGE_SCALE = 10_000; // BPS_POWER: 2x → 20000

export interface OpenPositionParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Collateral to commit, in whole tokens of the funding asset. */
  collateralAmount: number;
  /** Target leverage, e.g. 2 for 2x. */
  leverage: number;
  /** Funding asset; defaults to the market's collateral asset. */
  collateralSymbol?: string;
  /** Max entry slippage in basis points (default 100 = 1%). */
  slippageBps?: number;
  poolName?: string;
}

/** Build an UNSIGNED open-position instruction set. Submit with `sendAndConfirmEr`. */
export async function buildOpenPosition(
  flash: FlashClient,
  params: OpenPositionParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  const collateralAmount = toTokenAmount(params.collateralAmount, t.fundingDecimals);
  const leverage = new BN(Math.round(params.leverage * LEVERAGE_SCALE));

  // Simulate the trade to get the exact size and the mark price for slippage.
  // collateralSymbol is the market's lock custody; receiving is what we fund with.
  const quote: ViewResult = await t.sdk.views.getOpenPositionQuote(t.pc, {
    market: t.marketAccount,
    targetSymbol: t.targetSymbol,
    collateralSymbol: t.lockSymbol,
    receivingSymbol: t.fundingSymbol,
    amountIn: collateralAmount,
    leverage,
  });
  const sizeAmount: BN = quote['sizeAmount'];
  const markPrice = {
    price: new BN(quote['entryPrice'].price.toString()),
    exponent: new BN(quote['entryPrice'].exponent.toString()),
  };
  const priceWithSlippage = t.sdk.getPriceAfterSlippage(
    true,
    new BN(params.slippageBps ?? 100),
    markPrice,
    t.side
  );

  return t.sdk.openPosition(
    t.targetSymbol,
    t.lockSymbol,
    t.fundingSymbol,
    t.side,
    t.pc,
    priceWithSlippage,
    collateralAmount,
    sizeAmount
  );
}
