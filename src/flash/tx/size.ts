import { BN } from '@coral-xyz/anchor';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { fetchMarkPrice, resolveTrade, toTokenAmount } from './common';

// ---------------------------------------------------------------------------
// Change an existing position's size. Increase adds size + collateral (entry
// slippage); decrease removes size (exit slippage). Both derive the current
// mark from a nominal quote, like open/close.
// ---------------------------------------------------------------------------

export interface IncreaseSizeParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Additional size, in target-asset tokens. */
  sizeDelta: number;
  /** Additional collateral, in funding-asset tokens. */
  collateralAmount: number;
  collateralSymbol?: string;
  receivingSymbol?: string;
  slippageBps?: number;
  poolName?: string;
}

/** Build an UNSIGNED increase-size instruction set. Submit with `sendAndConfirmEr`. */
export async function buildIncreaseSize(
  flash: FlashClient,
  params: IncreaseSizeParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  const price = t.sdk.getPriceAfterSlippage(
    true,
    new BN(params.slippageBps ?? 100),
    await fetchMarkPrice(t),
    t.side
  );
  return t.sdk.increasePositionSize(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    price,
    toTokenAmount(params.sizeDelta, t.targetDecimals),
    toTokenAmount(params.collateralAmount, t.fundingDecimals),
    params.receivingSymbol ?? t.fundingSymbol
  );
}

export interface DecreaseSizeParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Size to remove, in target-asset tokens. */
  sizeDelta: number;
  collateralSymbol?: string;
  /** Asset paid out; defaults to the market's collateral (lock) asset. */
  dispensingSymbol?: string;
  slippageBps?: number;
  poolName?: string;
}

/** Build an UNSIGNED decrease-size instruction set. Submit with `sendAndConfirmEr`. */
export async function buildDecreaseSize(
  flash: FlashClient,
  params: DecreaseSizeParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  const price = t.sdk.getPriceAfterSlippage(
    false,
    new BN(params.slippageBps ?? 100),
    await fetchMarkPrice(t),
    t.side
  );
  return t.sdk.decreasePositionSize(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    price,
    toTokenAmount(params.sizeDelta, t.targetDecimals),
    params.dispensingSymbol ?? t.lockSymbol
  );
}
