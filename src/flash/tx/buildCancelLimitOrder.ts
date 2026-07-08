import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade } from './tradeResolution';

// Cancel a resting limit order by id.

export interface CancelLimitOrderParams {
  targetSymbol: string;
  side: 'long' | 'short';
  orderId: number;
  collateralSymbol?: string;
  receivingSymbol?: string;
  poolName?: string;
}

/** Build an UNSIGNED cancel-limit-order instruction set. */
export function buildCancelLimitOrder(
  flash: FlashClient,
  params: CancelLimitOrderParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.cancelLimitOrder(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    params.orderId,
    params.receivingSymbol ?? t.fundingSymbol
  );
}
