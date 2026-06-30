import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import {
  type Address,
  getMultipleAccountsInfo,
  getParsedAccountInfo,
  parseMintAccount,
  toPublicKey,
} from 'solana-library';
import { DLMM_PROGRAM_ID } from '../constants';
import { type LbPair, parseBinArray, parseLbPair } from './layouts';
import {
  binIdToBinArrayIndex,
  deriveBinArray,
  getBinFromBinArray,
  getPriceOfBinByBinId,
} from './helpers';

// ---------------------------------------------------------------------------
// Active bin & price. The active bin is the one currently being traded; its id
// drives the pool's spot price via (1 + binStep/10000) ^ binId.
//
// Token decimals only affect `pricePerToken` (a cosmetic rescale). They never
// change, so callers that already know them can pass them in to skip the mint
// reads entirely. Otherwise the mints are fetched in the *same* batch as the
// bin array — never as separate round-trips.
// ---------------------------------------------------------------------------

export type ActiveBin = {
  lbPair: PublicKey;
  binId: number;
  /** Spot price per lamport, decimal string. */
  price: string;
  /** Spot price per token (adjusted for token decimals), decimal string. */
  pricePerToken: string;
  xAmount: BigNumber;
  yAmount: BigNumber;
  supply: BigNumber;
};

export type ActiveBinOptions = {
  programId?: PublicKey;
  /** Pass known token decimals to skip the mint-account reads. */
  decimalsX?: number;
  decimalsY?: number;
};

/** Read a mint's decimals, or throw — never silently assume 0. */
function mintDecimals(
  info: AccountInfo<Buffer> | null,
  mint: PublicKey
): number {
  if (!info) {
    throw new Error(
      `DLMM: could not read token decimals — mint account ${mint.toBase58()} was not found`
    );
  }
  return parseMintAccount(info.data).decimals;
}

function priceStrings(
  lbPair: LbPair,
  decimalsX: number,
  decimalsY: number
): { binId: number; price: string; pricePerToken: string } {
  const price = getPriceOfBinByBinId(lbPair.binStep, lbPair.activeId);
  const pricePerToken = new BigNumber(price)
    .times(new BigNumber(10).pow(decimalsX - decimalsY))
    .toString();
  return { binId: lbPair.activeId, price, pricePerToken };
}

/**
 * Spot price of a pool's active bin. Costs **1 RPC** when `decimalsX`/`decimalsY`
 * are supplied, otherwise 2 (one extra batched read for the two mints).
 */
export async function getActiveBinPrice(
  connection: Connection,
  lbPairAddress: Address,
  options: Pick<ActiveBinOptions, 'decimalsX' | 'decimalsY'> = {}
): Promise<{ binId: number; price: string; pricePerToken: string } | null> {
  const lbPair = await getParsedAccountInfo(connection, parseLbPair, lbPairAddress);
  if (!lbPair) return null;

  let { decimalsX, decimalsY } = options;
  if (decimalsX === undefined || decimalsY === undefined) {
    const [x, y] = await getMultipleAccountsInfo(connection, [
      lbPair.tokenXMint,
      lbPair.tokenYMint,
    ]);
    decimalsX = mintDecimals(x, lbPair.tokenXMint);
    decimalsY = mintDecimals(y, lbPair.tokenYMint);
  }

  return priceStrings(lbPair, decimalsX, decimalsY);
}

/**
 * The full active bin of a pool: id, price, and current X/Y liquidity.
 *
 * Costs **2 RPC** total: one for the pool, then a single batched read for the
 * active bin array (and the two mints, unless decimals are supplied). Returns
 * `null` if the pool or its active bin array is missing.
 */
export async function getActiveBin(
  connection: Connection,
  lbPairAddress: Address,
  options: ActiveBinOptions = {}
): Promise<ActiveBin | null> {
  const programId = options.programId ?? DLMM_PROGRAM_ID;
  const lbPairPk = toPublicKey(lbPairAddress);

  const lbPair = await getParsedAccountInfo(connection, parseLbPair, lbPairPk);
  if (!lbPair) return null;

  const [binArrayKey] = deriveBinArray(
    lbPairPk,
    binIdToBinArrayIndex(lbPair.activeId),
    programId
  );

  // Single batched read: bin array first, then the mints only if needed.
  const needMints =
    options.decimalsX === undefined || options.decimalsY === undefined;
  const keys = needMints
    ? [binArrayKey, lbPair.tokenXMint, lbPair.tokenYMint]
    : [binArrayKey];
  const infos = await getMultipleAccountsInfo(connection, keys);

  const binArrayInfo = infos[0];
  if (!binArrayInfo) return null;
  const binArray = parseBinArray(binArrayInfo.data);

  const decimalsX = needMints
    ? mintDecimals(infos[1], lbPair.tokenXMint)
    : (options.decimalsX as number);
  const decimalsY = needMints
    ? mintDecimals(infos[2], lbPair.tokenYMint)
    : (options.decimalsY as number);

  const bin = getBinFromBinArray(lbPair.activeId, binArray);
  const { price, pricePerToken } = priceStrings(lbPair, decimalsX, decimalsY);

  return {
    lbPair: lbPairPk,
    binId: lbPair.activeId,
    price,
    pricePerToken,
    xAmount: bin.amountX,
    yAmount: bin.amountY,
    supply: bin.liquiditySupply,
  };
}
