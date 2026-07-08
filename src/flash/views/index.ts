// flash · views — pre-trade quotes and live position metrics. Read-only ER
// simulations wrapping the SDK's `views.*`: no signing, no state change.

export {
  getOpenPositionQuote,
  type OpenPositionQuote,
  type OpenPositionQuoteParams,
} from './getOpenPositionQuote';
export { getClosePositionQuote, type ClosePositionQuoteParams } from './getClosePositionQuote';
export { getUserPnl } from './getUserPnl';
export { getUserPositionData } from './getUserPositionData';
export { getUserLiquidationPrice } from './getUserLiquidationPrice';
export { type PositionRef } from './positionView';
export { type ViewResult } from './viewResult';
