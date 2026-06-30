import { Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import {
  type Address,
  type ParsedAccount,
  dataSizeFilter,
  memcmpFilter,
  getMultipleAccountsInfo,
  getParsedMultipleAccountInfo,
  getParsedProgramAccounts,
  parseMintAccount,
  toPublicKey,
} from 'solana-library';
import { DLMM_PROGRAM_ID } from '../constants';
import {
  type BinArray,
  type DlmmPosition,
  type LbPair,
  POSITION_OWNER_OFFSET,
  POSITION_V1_SIZE,
  POSITION_V2_SIZE,
  parseBinArray,
  parseLbPair,
  parsePositionV1,
  parsePositionV2,
} from './layouts';
import { binIdToBinArrayIndex, deriveBinArray, processPosition } from './helpers';

// ---------------------------------------------------------------------------
// The core read flow, mirroring Sonarwatch's dlmmPositionsFetcher: find a
// wallet's positions, fetch the bin arrays + pools they reference, and value
// each one. Returns plain typed objects (raw on-chain amounts); USD valuation
// is opt-in via ./pricing.
// ---------------------------------------------------------------------------

export type DlmmPositionResult = {
  position: PublicKey;
  lbPair: PublicKey;
  owner: PublicKey;
  version: 'V1' | 'V2';
  tokenXMint: PublicKey;
  tokenYMint: PublicKey;
  decimalsX: number;
  decimalsY: number;
  lowerBinId: number;
  upperBinId: number;
  /** Raw, lamport-scale underlying amounts. */
  totalXAmount: BigNumber;
  totalYAmount: BigNumber;
  /** Claimable swap fees, raw units. */
  feeX: BigNumber;
  feeY: BigNumber;
  /** Claimable LM rewards (reward slots one and two), raw units. */
  rewardOne: BigNumber;
  rewardTwo: BigNumber;
  /** Reward mints for slots one and two, or `null` when unused. */
  rewardMints: [PublicKey | null, PublicKey | null];
  /** True when one side is fully depleted (price moved out of the range). */
  outOfRange: boolean;
};

function rewardMint(lbPair: LbPair, slot: 0 | 1): PublicKey | null {
  const mint = lbPair.rewardInfos[slot].mint;
  return mint.equals(PublicKey.default) ? null : mint;
}

/** The two bin-array pubkeys (lower, upper) a position's range spans. */
function positionBinArrays(
  position: Pick<DlmmPosition, 'lowerBinId' | 'upperBinId' | 'lbPair'>,
  programId: PublicKey
): [PublicKey, PublicKey] {
  const [lower] = deriveBinArray(
    position.lbPair,
    binIdToBinArrayIndex(position.lowerBinId),
    programId
  );
  const [upper] = deriveBinArray(
    position.lbPair,
    binIdToBinArrayIndex(position.upperBinId),
    programId
  );
  return [lower, upper];
}

export type GetDlmmPositionsOptions = {
  programId?: PublicKey;
};

/** Parse a position account, picking the V1/V2 layout by its data size. */
function parsePositionBySize(data: Buffer): DlmmPosition | null {
  if (data.length === POSITION_V2_SIZE) return parsePositionV2(data);
  if (data.length === POSITION_V1_SIZE) return parsePositionV1(data);
  return null;
}

/** All DLMM positions (V1 + V2) owned by `owner`, valued and decoded. */
export async function getDlmmPositionsByOwner(
  connection: Connection,
  owner: Address,
  options: GetDlmmPositionsOptions = {}
): Promise<DlmmPositionResult[]> {
  const programId = options.programId ?? DLMM_PROGRAM_ID;
  const ownerPk = toPublicKey(owner);

  const [positionsV1, positionsV2] = await Promise.all([
    getParsedProgramAccounts(connection, parsePositionV1, programId, {
      filters: [
        dataSizeFilter(POSITION_V1_SIZE),
        memcmpFilter(POSITION_OWNER_OFFSET, ownerPk),
      ],
    }),
    getParsedProgramAccounts(connection, parsePositionV2, programId, {
      filters: [
        dataSizeFilter(POSITION_V2_SIZE),
        memcmpFilter(POSITION_OWNER_OFFSET, ownerPk),
      ],
    }),
  ]);

  return valuePositions(connection, [...positionsV1, ...positionsV2], programId);
}

/**
 * Details for an explicit list of position pubkeys, valued and decoded. The
 * V1/V2 layout is detected per account; addresses that don't exist or aren't
 * DLMM positions are skipped (the result may be shorter than the input).
 */
export async function getDlmmPositions(
  connection: Connection,
  positionAddresses: Address[],
  options: GetDlmmPositionsOptions = {}
): Promise<DlmmPositionResult[]> {
  const programId = options.programId ?? DLMM_PROGRAM_ID;
  const pubkeys = positionAddresses.map(toPublicKey);

  const accounts = await getMultipleAccountsInfo(connection, pubkeys);
  const positions: ParsedAccount<DlmmPosition>[] = [];
  accounts.forEach((account, i) => {
    if (!account) return;
    const parsed = parsePositionBySize(account.data);
    if (!parsed) return;
    positions.push({ ...parsed, pubkey: pubkeys[i], lamports: account.lamports });
  });

  return valuePositions(connection, positions, programId);
}

/**
 * Shared pipeline: given decoded position accounts, fetch the bin arrays,
 * pools, and token decimals they reference and value each position.
 */
async function valuePositions(
  connection: Connection,
  positions: ParsedAccount<DlmmPosition>[],
  programId: PublicKey
): Promise<DlmmPositionResult[]> {
  if (positions.length === 0) return [];

  // Collect the bin arrays and pools every position references.
  const binArrayKeys = new Map<string, PublicKey>();
  const lbPairKeys = new Map<string, PublicKey>();
  for (const position of positions) {
    const [lower, upper] = positionBinArrays(position, programId);
    binArrayKeys.set(lower.toBase58(), lower);
    binArrayKeys.set(upper.toBase58(), upper);
    lbPairKeys.set(position.lbPair.toBase58(), position.lbPair);
  }

  const [binArrayAccounts, lbPairAccounts] = await Promise.all([
    getParsedMultipleAccountInfo(connection, parseBinArray, [...binArrayKeys.values()]),
    getParsedMultipleAccountInfo(connection, parseLbPair, [...lbPairKeys.values()]),
  ]);

  const binArraysById = new Map<string, ParsedAccount<BinArray>>();
  for (const a of binArrayAccounts) {
    if (a) binArraysById.set(a.pubkey.toBase58(), a);
  }
  const lbPairsById = new Map<string, ParsedAccount<LbPair>>();
  for (const a of lbPairAccounts) {
    if (a) lbPairsById.set(a.pubkey.toBase58(), a);
  }

  // Decimals for every token X / Y of the involved pools.
  const mintKeys = new Map<string, PublicKey>();
  for (const lbPair of lbPairsById.values()) {
    mintKeys.set(lbPair.tokenXMint.toBase58(), lbPair.tokenXMint);
    mintKeys.set(lbPair.tokenYMint.toBase58(), lbPair.tokenYMint);
  }
  const mintAccounts = await getParsedMultipleAccountInfo(
    connection,
    parseMintAccount,
    [...mintKeys.values()]
  );
  const decimalsByMint = new Map<string, number>();
  for (const a of mintAccounts) {
    if (a) decimalsByMint.set(a.pubkey.toBase58(), a.decimals);
  }

  const results: DlmmPositionResult[] = [];
  for (const position of positions) {
    const lbPair = lbPairsById.get(position.lbPair.toBase58());
    if (!lbPair) continue;
    const [lowerKey, upperKey] = positionBinArrays(position, programId);
    const lowerBinArray = binArraysById.get(lowerKey.toBase58());
    const upperBinArray = binArraysById.get(upperKey.toBase58());
    if (!lowerBinArray || !upperBinArray) continue;

    const decimalsX = decimalsByMint.get(lbPair.tokenXMint.toBase58());
    const decimalsY = decimalsByMint.get(lbPair.tokenYMint.toBase58());
    if (decimalsX === undefined || decimalsY === undefined) continue;

    const data = processPosition(
      lbPair,
      position,
      decimalsX,
      decimalsY,
      lowerBinArray,
      upperBinArray
    );
    if (!data) continue;

    results.push({
      position: position.pubkey,
      lbPair: position.lbPair,
      owner: position.owner,
      version: position.version,
      tokenXMint: lbPair.tokenXMint,
      tokenYMint: lbPair.tokenYMint,
      decimalsX,
      decimalsY,
      lowerBinId: data.lowerBinId,
      upperBinId: data.upperBinId,
      totalXAmount: data.totalXAmount,
      totalYAmount: data.totalYAmount,
      feeX: data.feeX,
      feeY: data.feeY,
      rewardOne: data.rewardOne,
      rewardTwo: data.rewardTwo,
      rewardMints: [rewardMint(lbPair, 0), rewardMint(lbPair, 1)],
      outOfRange: data.totalXAmount.isZero() || data.totalYAmount.isZero(),
    });
  }

  return results;
}
