// ---------------------------------------------------------------------------
// flash · tx — write builders.
//
// Every builder wraps an SDK instruction builder and returns an UNSIGNED
// `InstructionResult` ({ instructions, additionalSigners }); the caller signs
// and submits with `sendAndConfirmEr` (trades) or `sendAndConfirmBase` (setup).
// This keeps signing, priority fees, and session vs. direct fully in the
// caller's hands.
// ---------------------------------------------------------------------------

// Submit helpers.
export { sendAndConfirmEr, sendAndConfirmBase } from './send';

// Conversion helpers (useful when composing custom instructions).
export {
  toSide,
  toTokenAmount,
  toUsdAmount,
  usdToContractPrice,
} from './common';

// Account setup + funds lifecycle.
export {
  buildInitializeBasket,
  buildInitializeUserDepositLedger,
  buildInitTradeVault,
  buildDeposit,
  buildDelegateBasket,
  type DepositParams,
} from './setup';

// Trading.
export { buildOpenPosition, type OpenPositionParams } from './openPosition';
export { buildClosePosition, type ClosePositionParams } from './closePosition';
export {
  buildIncreaseSize,
  buildDecreaseSize,
  type IncreaseSizeParams,
  type DecreaseSizeParams,
} from './size';
export {
  buildAddCollateral,
  buildRemoveCollateral,
  type AddCollateralParams,
  type RemoveCollateralParams,
} from './collateral';

// Orders.
export {
  buildPlaceLimitOrder,
  buildEditLimitOrder,
  buildCancelLimitOrder,
  buildPlaceTriggerOrder,
  buildCancelTriggerOrder,
  type PlaceLimitOrderParams,
  type EditLimitOrderParams,
  type CancelLimitOrderParams,
  type PlaceTriggerOrderParams,
  type CancelTriggerOrderParams,
} from './orders';
