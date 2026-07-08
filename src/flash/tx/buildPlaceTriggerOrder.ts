import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade, toTokenAmount, usdToContractPrice } from './tradeResolution';

// Place a trigger order (take-profit / stop-loss) against an open position.

export interface PlaceTriggerOrderParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Trigger price in USD. */
  triggerPrice: number;
  /** Size to close when triggered, in target-asset tokens. */
  size: number;
  /** true = stop-loss, false = take-profit. */
  isStopLoss: boolean;
  collateralSymbol?: string;
  receivingSymbol?: string;
  poolName?: string;
}

/** Build an UNSIGNED place-trigger-order (TP/SL) instruction set. */
export function buildPlaceTriggerOrder(
  flash: FlashClient,
  params: PlaceTriggerOrderParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.placeTriggerOrder(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    usdToContractPrice(params.triggerPrice),
    toTokenAmount(params.size, t.targetDecimals),
    params.isStopLoss,
    params.receivingSymbol ?? t.lockSymbol
  );
}
