import BigNumber from 'bignumber.js';
import { BASIS_POINT_MAX, SCALE_OFFSET } from '../../constants';

// ---------------------------------------------------------------------------
// Fixed-point math for DLMM, ported from the Meteora SDK / Sonarwatch helpers
// but expressed purely in bignumber.js (no bn.js / decimal.js). Liquidity
// shares and per-token accumulators are Q64.64, so "shift right by 64" is just
// an integer division by 2^64.
// ---------------------------------------------------------------------------

export enum Rounding {
  Up,
  Down,
}

/** 2^64, the Q64.64 scale factor. */
export const TWO_POW_64 = new BigNumber(2).pow(SCALE_OFFSET);

/** Truncate toward zero to an integer (mirrors converting a BigNumber to a BN). */
export function toInt(value: BigNumber): BigNumber {
  return value.integerValue(BigNumber.ROUND_DOWN);
}

/** Exact integer `floor(x * y / denominator)`, with optional round-up. */
export function mulDiv(
  x: BigNumber,
  y: BigNumber,
  denominator: BigNumber,
  rounding: Rounding
): BigNumber {
  const product = x.times(y);
  const quotient = product.idiv(denominator);
  if (rounding === Rounding.Up && !product.mod(denominator).isZero()) {
    return quotient.plus(1);
  }
  return quotient;
}

/** `(x * y) >> offset` — multiply two Q-numbers and rescale. */
export function mulShr(
  x: BigNumber,
  y: BigNumber,
  offset: number,
  rounding: Rounding
): BigNumber {
  const denominator = new BigNumber(2).pow(offset);
  return mulDiv(x, y, denominator, rounding);
}

/** `x >> 64` — drop the fractional half of a Q64.64 number. */
export function shiftRight64(x: BigNumber): BigNumber {
  return toInt(x).idiv(TWO_POW_64);
}

/**
 * Price of a bin, per lamport, from its id: `(1 + binStep / 10000) ^ binId`.
 * `binId` is a signed integer (can be negative); the result is returned as a
 * decimal string. Multiply by `10 ^ (decimalsX - decimalsY)` for price per token.
 */
export function getPriceOfBinByBinId(binStep: number, binId: number): string {
  const binStepNum = new BigNumber(binStep).div(BASIS_POINT_MAX);
  return new BigNumber(1).plus(binStepNum).pow(binId).toString();
}
