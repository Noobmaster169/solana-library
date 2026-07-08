import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade, toTokenAmount, usdToContractPrice } from './tradeResolution';
import type { PlaceLimitOrderParams } from './buildPlaceLimitOrder';

// Edit an existing limit order by id (same fields as placing one).

/** Zero price signals "no take-profit / stop-loss attached". */
const NO_PRICE = usdToContractPrice(0);

export interface EditLimitOrderParams extends PlaceLimitOrderParams {
  orderId: number;
}

/** Build an UNSIGNED edit-limit-order instruction set. */
export function buildEditLimitOrder(
  flash: FlashClient,
  params: EditLimitOrderParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.editLimitOrder(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    params.orderId,
    usdToContractPrice(params.limitPrice),
    toTokenAmount(params.size, t.targetDecimals),
    params.stopLossPrice ? usdToContractPrice(params.stopLossPrice) : NO_PRICE,
    params.takeProfitPrice ? usdToContractPrice(params.takeProfitPrice) : NO_PRICE,
    params.receivingSymbol ?? t.fundingSymbol
  );
}
