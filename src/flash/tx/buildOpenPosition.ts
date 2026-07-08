import { BN } from '@coral-xyz/anchor';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { oraclePriceToBN, resolveTrade, simulateOpenQuote, toLeverageBN, toTokenAmount } from './tradeResolution';

// Open a position. Flash needs a concrete size + a slippage-bounded entry price
// (not a leverage number), so the builder simulates a quote — the same math the
// trade will use — to derive both, then builds the UNSIGNED instruction.

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
  const q = await simulateOpenQuote(t, collateralAmount, toLeverageBN(params.leverage));
  const priceWithSlippage = t.sdk.getPriceAfterSlippage(
    true,
    new BN(params.slippageBps ?? 100),
    oraclePriceToBN(q.entryPrice),
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
    q.sizeAmount
  );
}
