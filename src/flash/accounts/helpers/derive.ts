import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import type { BN } from '@coral-xyz/anchor';
import {
  findBasketAddress,
  findMarketAddress,
} from '@flash_trade/flash-sdk-v2';
import { getMarkets, type FlashMarket } from '../../markets';
import { DEFAULT_CLUSTER, DEFAULT_POOL_NAME, type Cluster } from '../../constants';

// ---------------------------------------------------------------------------
// PDA derivation + small decode helpers shared by the account readers.
// PDAs come straight from the SDK (single source of truth for seeds/bumps).
// ---------------------------------------------------------------------------

/** The per-owner Basket PDA (holds all positions + orders). */
export { findBasketAddress, findMarketAddress };

/** Coerce a base58 string or PublicKey to a PublicKey. */
export function toPublicKey(value: string | PublicKey): PublicKey {
  return typeof value === 'string' ? new PublicKey(value) : value;
}

/** Look up normalized market metadata by its on-chain market account. */
export function marketByAccount(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName: string = DEFAULT_POOL_NAME
): Map<string, FlashMarket> {
  const map = new Map<string, FlashMarket>();
  for (const m of getMarkets(cluster, poolName)) map.set(m.marketAccount.toBase58(), m);
  return map;
}

/** A fixed-point BN with `decimals` places → a JS number (via BigNumber). */
export function bnToNumber(value: BN, decimals: number): number {
  return new BigNumber(value.toString()).shiftedBy(-decimals).toNumber();
}

/** An on-chain OraclePrice `{ price, exponent }` → a JS number.
 *  `exponent` may decode as a BN or a plain number depending on the source. */
export function oraclePriceToNumber(op: {
  price: BN | number | string;
  exponent: BN | number;
}): number {
  const exponent =
    typeof op.exponent === 'number' ? op.exponent : op.exponent.toNumber();
  return new BigNumber(op.price.toString()).shiftedBy(exponent).toNumber();
}
