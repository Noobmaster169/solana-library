import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { resolveTrade, toTokenAmount, usdToContractPrice } from './common';

// ---------------------------------------------------------------------------
// Limit orders (entries) and trigger orders (take-profit / stop-loss).
// Prices are plain USD numbers; sizes are in target-asset tokens; reserve is in
// funding tokens. All builders return UNSIGNED instructions for the ER.
// ---------------------------------------------------------------------------

/** Zero price signals "no take-profit / stop-loss attached". */
const NO_PRICE = usdToContractPrice(0);

export interface PlaceLimitOrderParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Trigger (limit) price in USD. */
  limitPrice: number;
  /** Position size to open, in target-asset tokens. */
  size: number;
  /** Collateral reserved for the order, in funding tokens. */
  reserveAmount: number;
  /** Optional attached exit prices in USD. */
  stopLossPrice?: number;
  takeProfitPrice?: number;
  collateralSymbol?: string;
  receivingSymbol?: string;
  poolName?: string;
}

/** Build an UNSIGNED place-limit-order instruction set. */
export function buildPlaceLimitOrder(
  flash: FlashClient,
  params: PlaceLimitOrderParams
): Promise<InstructionResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.placeLimitOrder(
    t.targetSymbol,
    t.lockSymbol,
    t.side,
    t.pc,
    usdToContractPrice(params.limitPrice),
    toTokenAmount(params.reserveAmount, t.fundingDecimals),
    toTokenAmount(params.size, t.targetDecimals),
    params.stopLossPrice ? usdToContractPrice(params.stopLossPrice) : NO_PRICE,
    params.takeProfitPrice ? usdToContractPrice(params.takeProfitPrice) : NO_PRICE,
    params.receivingSymbol ?? t.fundingSymbol
  );
}

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
