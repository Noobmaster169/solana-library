// ===========================================================================
// DLMM · accounts — reading on-chain data & positions.
//
// CORE FUNCTIONS (what most developers use) come first; account decoders and
// lower-level helpers follow.
// ===========================================================================

// ── Core read functions ────────────────────────────────────────────────────
export {
  getDlmmPositionsByOwner,
  getDlmmPositions,
  type DlmmPositionResult,
  type GetDlmmPositionsOptions,
} from './getPositions';
export {
  getLbPair,
  getLbPairs,
  getAllLbPairs,
  type GetAllLbPairsOptions,
} from './getPools';
export {
  getActiveBin,
  getActiveBinPrice,
  type ActiveBin,
  type ActiveBinOptions,
} from './getActiveBin';

// ── Optional USD valuation (Jupiter) ───────────────────────────────────────
export { attachUsdValues, type DlmmPositionValued } from './pricing';

// ── Account decoders + layout types ─────────────────────────────────────────
export {
  parseLbPair,
  parsePositionV1,
  parsePositionV2,
  parseBinArray,
  LBPAIR_SIZE,
  POSITION_V1_SIZE,
  POSITION_V2_SIZE,
  POSITION_OWNER_OFFSET,
  type LbPair,
  type DlmmPosition,
  type PositionVersion,
  type BinArray,
  type Bin,
  type RewardInfo,
  type UserRewardInfo,
  type FeeInfo,
  type StaticParameters,
  type VariableParameters,
} from './layouts';

// ── Lower-level helpers (PDAs, math, valuation internals) ───────────────────
// Namespaced to keep them separate from the core functions above.
export * as helpers from './helpers';
