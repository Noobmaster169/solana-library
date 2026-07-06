import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { BufferReader } from '@solana';

// ---------------------------------------------------------------------------
// On-chain DLMM account layouts, transcribed field-for-field from the Meteora
// program and decoded with solana-library's BufferReader (no beet). Each
// parser is a `(data: Buffer) => T` so it drops straight into
// getParsedProgramAccounts / getParsedMultipleAccountInfo.
// ---------------------------------------------------------------------------

const ANCHOR_DISCRIMINATOR = 8;

// --- Account data sizes (used as getProgramAccounts size filters) ---

/** `LbPair` (pool) account size. */
export const LBPAIR_SIZE = 904;
/** Legacy (u64 shares) position account size. */
export const POSITION_V1_SIZE = 7560;
/** Current (u128 shares) position account size. */
export const POSITION_V2_SIZE = 8120;
/** Offset of the `owner` pubkey in a position account (8 disc + 32 lbPair). */
export const POSITION_OWNER_OFFSET = 40;

export type StaticParameters = {
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  maxVolatilityAccumulator: number;
  minBinId: number;
  maxBinId: number;
  protocolShare: number;
};

function readStaticParameters(r: BufferReader): StaticParameters {
  const p: StaticParameters = {
    baseFactor: r.u16(),
    filterPeriod: r.u16(),
    decayPeriod: r.u16(),
    reductionFactor: r.u16(),
    variableFeeControl: r.u32(),
    maxVolatilityAccumulator: r.u32(),
    minBinId: r.i32(),
    maxBinId: r.i32(),
    protocolShare: r.u16(),
  };
  r.skip(6); // padding
  return p;
}

export type VariableParameters = {
  volatilityAccumulator: number;
  volatilityReference: number;
  indexReference: number;
  lastUpdateTimestamp: BigNumber;
};

function readVariableParameters(r: BufferReader): VariableParameters {
  const volatilityAccumulator = r.u32();
  const volatilityReference = r.u32();
  const indexReference = r.i32();
  r.skip(4); // padding
  const lastUpdateTimestamp = r.i64();
  r.skip(8); // padding1
  return {
    volatilityAccumulator,
    volatilityReference,
    indexReference,
    lastUpdateTimestamp,
  };
}

export type RewardInfo = {
  mint: PublicKey;
  vault: PublicKey;
  funder: PublicKey;
  rewardDuration: BigNumber;
  rewardDurationEnd: BigNumber;
  rewardRate: BigNumber;
  lastUpdateTime: BigNumber;
  cumulativeSecondsWithEmptyLiquidityReward: BigNumber;
};

function readRewardInfo(r: BufferReader): RewardInfo {
  return {
    mint: r.publicKey(),
    vault: r.publicKey(),
    funder: r.publicKey(),
    rewardDuration: r.u64(),
    rewardDurationEnd: r.u64(),
    rewardRate: r.u128(),
    lastUpdateTime: r.u64(),
    cumulativeSecondsWithEmptyLiquidityReward: r.u64(),
  };
}

export type LbPair = {
  parameters: StaticParameters;
  vParameters: VariableParameters;
  pairType: number;
  activeId: number;
  binStep: number;
  status: number;
  tokenXMint: PublicKey;
  tokenYMint: PublicKey;
  reserveX: PublicKey;
  reserveY: PublicKey;
  protocolFeeX: BigNumber;
  protocolFeeY: BigNumber;
  rewardInfos: RewardInfo[];
  oracle: PublicKey;
  lastUpdatedAt: BigNumber;
  creator: PublicKey;
};

/** Decode an `LbPair` (pool) account. */
export function parseLbPair(data: Buffer): LbPair {
  const r = new BufferReader(data, ANCHOR_DISCRIMINATOR);
  const parameters = readStaticParameters(r);
  const vParameters = readVariableParameters(r);
  r.skip(1); // bumpSeed[1]
  r.skip(2); // binStepSeed[2]
  const pairType = r.u8();
  const activeId = r.i32();
  const binStep = r.u16();
  const status = r.u8();
  r.skip(1); // requireBaseFactorSeed
  r.skip(2); // baseFactorSeed[2]
  r.skip(1); // activationType
  r.skip(1); // padding1
  const tokenXMint = r.publicKey();
  const tokenYMint = r.publicKey();
  const reserveX = r.publicKey();
  const reserveY = r.publicKey();
  const protocolFeeX = r.u64();
  const protocolFeeY = r.u64();
  r.skip(32); // padding2
  const rewardInfos = [readRewardInfo(r), readRewardInfo(r)];
  const oracle = r.publicKey();
  r.skip(8 * 16); // binArrayBitmap u64[16]
  const lastUpdatedAt = r.i64();
  r.skip(32); // whitelistedWallet
  r.skip(32); // preActivationSwapAddress
  r.skip(32); // baseKey
  r.skip(8); // activationPoint
  r.skip(8); // preActivationDuration
  r.skip(8); // padding3
  r.skip(8); // padding4
  const creator = r.publicKey();
  // reserved[24] ignored
  return {
    parameters,
    vParameters,
    pairType,
    activeId,
    binStep,
    status,
    tokenXMint,
    tokenYMint,
    reserveX,
    reserveY,
    protocolFeeX,
    protocolFeeY,
    rewardInfos,
    oracle,
    lastUpdatedAt,
    creator,
  };
}

export type UserRewardInfo = {
  rewardPerTokenCompletesX: BigNumber;
  rewardPerTokenCompletesY: BigNumber;
  rewardPendingsX: BigNumber;
  rewardPendingsY: BigNumber;
};

function readUserRewardInfo(r: BufferReader): UserRewardInfo {
  return {
    rewardPerTokenCompletesX: r.u128(),
    rewardPerTokenCompletesY: r.u128(),
    rewardPendingsX: r.u64(),
    rewardPendingsY: r.u64(),
  };
}

export type FeeInfo = {
  feeXPerTokenComplete: BigNumber;
  feeYPerTokenComplete: BigNumber;
  feeXPending: BigNumber;
  feeYPending: BigNumber;
};

function readFeeInfo(r: BufferReader): FeeInfo {
  return {
    feeXPerTokenComplete: r.u128(),
    feeYPerTokenComplete: r.u128(),
    feeXPending: r.u64(),
    feeYPending: r.u64(),
  };
}

export type PositionVersion = 'V1' | 'V2';

export type DlmmPosition = {
  version: PositionVersion;
  lbPair: PublicKey;
  owner: PublicKey;
  liquidityShares: BigNumber[];
  rewardInfos: UserRewardInfo[];
  feeInfos: FeeInfo[];
  lowerBinId: number;
  upperBinId: number;
  lastUpdatedAt: BigNumber;
  totalClaimedFeeXAmount: BigNumber;
  totalClaimedFeeYAmount: BigNumber;
};

function readPosition(data: Buffer, version: PositionVersion): DlmmPosition {
  const r = new BufferReader(data, ANCHOR_DISCRIMINATOR);
  const lbPair = r.publicKey();
  const owner = r.publicKey();

  const liquidityShares: BigNumber[] = [];
  for (let i = 0; i < 70; i += 1) {
    liquidityShares.push(version === 'V1' ? r.u64() : r.u128());
  }
  const rewardInfos: UserRewardInfo[] = [];
  for (let i = 0; i < 70; i += 1) rewardInfos.push(readUserRewardInfo(r));
  const feeInfos: FeeInfo[] = [];
  for (let i = 0; i < 70; i += 1) feeInfos.push(readFeeInfo(r));

  const lowerBinId = r.i32();
  const upperBinId = r.i32();
  const lastUpdatedAt = r.i64();
  const totalClaimedFeeXAmount = r.u64();
  const totalClaimedFeeYAmount = r.u64();
  // totalClaimedRewards[2] + version-specific tail are not needed downstream.
  return {
    version,
    lbPair,
    owner,
    liquidityShares,
    rewardInfos,
    feeInfos,
    lowerBinId,
    upperBinId,
    lastUpdatedAt,
    totalClaimedFeeXAmount,
    totalClaimedFeeYAmount,
  };
}

/** Decode a legacy (V1, u64 shares) position account. */
export function parsePositionV1(data: Buffer): DlmmPosition {
  return readPosition(data, 'V1');
}

/** Decode a current (V2, u128 shares) position account. */
export function parsePositionV2(data: Buffer): DlmmPosition {
  return readPosition(data, 'V2');
}

export type Bin = {
  amountX: BigNumber;
  amountY: BigNumber;
  price: BigNumber;
  liquiditySupply: BigNumber;
  rewardPerTokenXStored: BigNumber;
  rewardPerTokenYStored: BigNumber;
  feeAmountXPerTokenStored: BigNumber;
  feeAmountYPerTokenStored: BigNumber;
  amountXIn: BigNumber;
  amountYIn: BigNumber;
};

function readBin(r: BufferReader): Bin {
  return {
    amountX: r.u64(),
    amountY: r.u64(),
    price: r.u128(),
    liquiditySupply: r.u128(),
    rewardPerTokenXStored: r.u128(),
    rewardPerTokenYStored: r.u128(),
    feeAmountXPerTokenStored: r.u128(),
    feeAmountYPerTokenStored: r.u128(),
    amountXIn: r.u128(),
    amountYIn: r.u128(),
  };
}

export type BinArray = {
  index: BigNumber;
  version: number;
  lbPair: PublicKey;
  bins: Bin[];
};

/** Decode a `BinArray` account (70 bins). */
export function parseBinArray(data: Buffer): BinArray {
  const r = new BufferReader(data, ANCHOR_DISCRIMINATOR);
  const index = r.i64();
  const version = r.u8();
  r.skip(7); // padding
  const lbPair = r.publicKey();
  const bins: Bin[] = [];
  for (let i = 0; i < 70; i += 1) bins.push(readBin(r));
  return { index, version, lbPair, bins };
}
