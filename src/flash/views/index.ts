// ---------------------------------------------------------------------------
// flash · views — pre-trade quotes and live position metrics.
//
// Read-only ER simulations wrapping the SDK's `views.*`: no signing, no state
// change. Use these for fees/entry/liquidation before opening, and for PnL /
// liquidation price on an existing position.
// ---------------------------------------------------------------------------

export {
  getOpenPositionQuote,
  getClosePositionQuote,
  type OpenPositionQuote,
  type OpenPositionQuoteParams,
  type ClosePositionQuoteParams,
} from './quote';
export {
  getPnl,
  getPositionData,
  getLiquidationPrice,
  type PositionRef,
} from './metrics';
export { type ViewResult } from './types';
