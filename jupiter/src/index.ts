// ---------------------------------------------------------------------------
// jupiter-library — a simplicity layer for Jupiter's APIs.
//
// Two jobs: fetch token prices (`/price/v3`) and fetch token information
// (`/tokens/v2/*`). Clean, batched, copy-pasteable functions over a thin HTTP
// client. No retry/rate-limiting layer (by design), no heavy abstractions.
// ---------------------------------------------------------------------------

// Client
export {
  createJupiterClient,
  type JupiterClient,
  type JupiterClientOptions,
} from './client/client';

// Price
export {
  getPrice,
  getPrices,
  getPricesAsMap,
} from './price/getPrice';
export {
  type TokenPrice,
  type GetPriceResponse,
} from './price/types';

// Token information
export {
  searchTokens,
  getToken,
  getTokens,
  getTokensAsMap,
} from './tokens/search';
export {
  getTokensByTag,
  getTrendingTokens,
  getRecentTokens,
} from './tokens/lists';
export {
  type TokenInfo,
  type SwapStats,
  type TokenAudit,
  type TokenTag,
  type TrendingCategory,
  type TrendingInterval,
} from './tokens/types';
