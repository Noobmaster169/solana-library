import { BN } from '@coral-xyz/anchor';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { fetchMarkPrice, resolveTrade, toTokenAmount } from './tradeResolution';

// Remove size from an existing position (exit-side slippage).

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
