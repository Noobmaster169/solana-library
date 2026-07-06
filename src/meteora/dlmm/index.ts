// ===========================================================================
// Meteora DLMM (Liquidity Book).
//
// Organized by interaction type:
//   accounts/  reading on-chain data & positions   — available now
//   api/       Meteora HTTP API integrations        — coming soon
//   tx/        transaction builders                 — coming soon
// ===========================================================================

// Shared protocol constants.
export {
  DLMM_PROGRAM_ID,
  MAX_BIN_ARRAY_SIZE,
  SCALE_OFFSET,
  BASIS_POINT_MAX,
} from './constants';

// Namespaced surfaces. `api` and `tx` will sit alongside `accounts` here.
export * as accounts from './accounts';
// export * as api from './api'; // coming soon
export * as tx from './tx';

// Convenience: the write helpers are also re-exported flat.
export * from './tx';

// Convenience: the core read functions are also re-exported flat, so
// `import { getLbPair } from 'meteora-library'` works directly.
export * from './accounts';
