// flash · tx — write builders. Each returns an UNSIGNED `InstructionResult`;
// submit with `sendAndConfirmEr` (trades) or `sendAndConfirmBase` (setup).

// Submit helpers.
export { sendAndConfirmEr, sendAndConfirmBase } from './sendAndConfirm';

// Conversion helpers (useful when composing custom instructions).
export { toSide, toTokenAmount, toUsdAmount, usdToContractPrice } from './tradeResolution';

// Account setup + delegation.
export {
  buildInitializeBasket,
  buildInitializeUserDepositLedger,
  buildInitTradeVault,
  buildDelegateBasket,
} from './accountSetup';

// Funds movement (base layer).
export { buildDeposit, type DepositParams } from './buildDeposit';
export { buildWithdraw, type WithdrawParams } from './buildWithdraw';
export {
  deriveWithdrawalReceiptAddress,
  isWithdrawalSettled,
  awaitWithdrawalSettled,
  type WithdrawalReceiptParams,
  type WithdrawalStatus,
  type AwaitWithdrawalOptions,
} from './withdrawalReceipt';

// Trading.
export { buildOpenPosition, type OpenPositionParams } from './buildOpenPosition';
export { buildClosePosition, type ClosePositionParams } from './buildClosePosition';
export { buildIncreaseSize, type IncreaseSizeParams } from './buildIncreaseSize';
export { buildDecreaseSize, type DecreaseSizeParams } from './buildDecreaseSize';
export { buildAddCollateral, type AddCollateralParams } from './buildAddCollateral';
export { buildRemoveCollateral, type RemoveCollateralParams } from './buildRemoveCollateral';

// Orders.
export { buildPlaceLimitOrder, type PlaceLimitOrderParams } from './buildPlaceLimitOrder';
export { buildEditLimitOrder, type EditLimitOrderParams } from './buildEditLimitOrder';
export { buildCancelLimitOrder, type CancelLimitOrderParams } from './buildCancelLimitOrder';
export { buildPlaceTriggerOrder, type PlaceTriggerOrderParams } from './buildPlaceTriggerOrder';
export { buildCancelTriggerOrder, type CancelTriggerOrderParams } from './buildCancelTriggerOrder';
