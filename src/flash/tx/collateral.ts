import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { resolveTrade, toTokenAmount, toUsdAmount } from './common';

// ---------------------------------------------------------------------------
// Adjust an existing position's collateral (changes its leverage).
// Add takes a token amount (the funding asset); remove takes a USD amount.
// ---------------------------------------------------------------------------

export interface AddCollateralParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Collateral to add, in whole tokens of the funding asset. */
  amount: number;
  collateralSymbol?: string;
  /** Asset paid in; defaults to the funding asset. */
  receivingSymbol?: string;
  poolName?: string;
}

/** Build an UNSIGNED add-collateral instruction set. Submit with `sendAndConfirmEr`. */
export function buildAddCollateral(
  flash: FlashClient,
  params: AddCollateralParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.addCollateral(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    toTokenAmount(params.amount, t.fundingDecimals),
    params.receivingSymbol ?? t.fundingSymbol
  );
}

export interface RemoveCollateralParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Collateral to remove, in USD. */
  amountUsd: number;
  collateralSymbol?: string;
  /** Asset paid out; defaults to the market's collateral (lock) asset. */
  dispensingSymbol?: string;
  poolName?: string;
}

/** Build an UNSIGNED remove-collateral instruction set. Submit with `sendAndConfirmEr`. */
export function buildRemoveCollateral(
  flash: FlashClient,
  params: RemoveCollateralParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.removeCollateral(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    toUsdAmount(params.amountUsd),
    params.dispensingSymbol ?? t.lockSymbol
  );
}
