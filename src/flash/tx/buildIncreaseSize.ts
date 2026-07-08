import { BN } from '@coral-xyz/anchor';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { fetchMarkPrice, resolveTrade, toTokenAmount } from './tradeResolution';

// Add size + collateral to an existing position (entry-side slippage).

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
