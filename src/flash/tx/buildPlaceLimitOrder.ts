import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { resolveTrade, toTokenAmount, usdToContractPrice } from './tradeResolution';

// Place a limit order (a resting entry). Prices are plain USD; size is in
// target-asset tokens; reserve is in funding tokens.

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
