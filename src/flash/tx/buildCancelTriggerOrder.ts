import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade } from './tradeResolution';

// Cancel a trigger order (take-profit / stop-loss) by id.

export interface CancelTriggerOrderParams {
  targetSymbol: string;
  side: 'long' | 'short';
  orderId: number;
  isStopLoss: boolean;
  collateralSymbol?: string;
  poolName?: string;
}

/** Build an UNSIGNED cancel-trigger-order instruction set. */
export function buildCancelTriggerOrder(
  flash: FlashClient,
  params: CancelTriggerOrderParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.cancelTriggerOrder(t.marketAccount, params.orderId, params.isStopLoss);
}
