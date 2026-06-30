import { Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import {
  type Address,
  getParsedAccountInfo,
  getParsedMultipleAccountInfo,
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

/** Spot price per token implied by a pool's active bin (no bin fetch needed). */
export async function getActiveBinPrice(
  connection: Connection,
  lbPairAddress: Address
): Promise<{ binId: number; price: string; pricePerToken: string } | null> {
  const lbPair = await getParsedAccountInfo(connection, parseLbPair, lbPairAddress);
  if (!lbPair) return null;
  return priceFromLbPair(lbPair, lbPair.tokenXMint, await decimalsDelta(connection, lbPair));
}

async function decimalsDelta(
  connection: Connection,
  lbPair: LbPair
): Promise<number> {
  const [x, y] = await getParsedMultipleAccountInfo(connection, parseMintAccount, [
    lbPair.tokenXMint,
    lbPair.tokenYMint,
  ]);
  const decimalsX = x?.decimals ?? 0;
  const decimalsY = y?.decimals ?? 0;
  return decimalsX - decimalsY;
}

function priceFromLbPair(
  lbPair: LbPair,
  _tokenXMint: PublicKey,
  decimalsDeltaValue: number
): { binId: number; price: string; pricePerToken: string } {
  const price = getPriceOfBinByBinId(lbPair.binStep, lbPair.activeId);
  const pricePerToken = new BigNumber(price)
    .times(new BigNumber(10).pow(decimalsDeltaValue))
    .toString();
  return { binId: lbPair.activeId, price, pricePerToken };
}

/**
 * The full active bin of a pool: its id, price, and current X/Y liquidity.
 * Returns `null` if the pool or its active bin array is missing.
 */
export async function getActiveBin(
  connection: Connection,
  lbPairAddress: Address,
  programId: PublicKey = DLMM_PROGRAM_ID
): Promise<ActiveBin | null> {
  const lbPairPk = toPublicKey(lbPairAddress);
  const lbPair = await getParsedAccountInfo(connection, parseLbPair, lbPairPk);
  if (!lbPair) return null;

  const [binArrayKey] = deriveBinArray(
    lbPairPk,
    binIdToBinArrayIndex(lbPair.activeId),
    programId
  );
  const [binArray, mintX, mintY] = await Promise.all([
    getParsedAccountInfo(connection, parseBinArray, binArrayKey),
    getParsedAccountInfo(connection, parseMintAccount, lbPair.tokenXMint),
    getParsedAccountInfo(connection, parseMintAccount, lbPair.tokenYMint),
  ]);
  if (!binArray) return null;

  const bin = getBinFromBinArray(lbPair.activeId, binArray);
  const decimalsDeltaValue = (mintX?.decimals ?? 0) - (mintY?.decimals ?? 0);
  const { price, pricePerToken } = priceFromLbPair(
    lbPair,
    lbPair.tokenXMint,
    decimalsDeltaValue
  );

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
