import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade, toTokenAmount } from './tradeResolution';

// Add collateral to an existing position (lowers its leverage). Takes a token
// amount of the funding asset.

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
