import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade, toUsdAmount } from './tradeResolution';

// Remove collateral from an existing position (raises its leverage). Takes a
// USD amount.

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
