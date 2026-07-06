import { BN } from '@coral-xyz/anchor';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { fetchMarkPrice, resolveTrade } from './common';

// ---------------------------------------------------------------------------
// Close a position fully (use decreasePositionSize for partials).
//
// Needs a slippage-bounded exit price: we read the current mark from a nominal
// quote, then bound it for the exit side. `collateralSymbol` passed to the SDK
// is the market's lock custody; the payout token is `receivingSymbol`.
// ---------------------------------------------------------------------------

export interface ClosePositionParams {
  targetSymbol: string;
  side: 'long' | 'short';
  collateralSymbol?: string;
  /** Asset paid out; defaults to the market's collateral (lock) asset. */
  receivingSymbol?: string;
  /** Max exit slippage in basis points (default 100 = 1%). */
  slippageBps?: number;
  poolName?: string;
}

/** Build an UNSIGNED close-position instruction set. Submit with `sendAndConfirmEr`. */
export async function buildClosePosition(
  flash: FlashClient,
  params: ClosePositionParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  const priceWithSlippage = t.sdk.getPriceAfterSlippage(
    false,
    new BN(params.slippageBps ?? 100),
    await fetchMarkPrice(t),
    t.side
  );
  return t.sdk.closePosition(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    priceWithSlippage,
    params.receivingSymbol ?? t.lockSymbol
  );
}
