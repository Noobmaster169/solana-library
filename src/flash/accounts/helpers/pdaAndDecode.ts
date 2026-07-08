import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { getAvailableMarkets, type FlashMarket } from '../../markets';
import { BASKET_SEED, DEFAULT_CLUSTER, PROGRAM_ID, type Cluster } from '../../constants';

// PDA derivation + small decode helpers for the on-chain read path — no SDK.

/** The per-owner Basket PDA (`['basket', owner]`), holding all positions + orders. */
export function deriveBasketAddress(
  owner: PublicKey,
  cluster: Cluster = DEFAULT_CLUSTER
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(BASKET_SEED), owner.toBuffer()],
    PROGRAM_ID[cluster]
  );
  return pda;
}

/** Coerce a base58 string or PublicKey to a PublicKey. */
export function toPublicKey(value: string | PublicKey): PublicKey {
  return typeof value === 'string' ? new PublicKey(value) : value;
}

/** Look up normalized market metadata by on-chain market account. Spans every pool unless `poolName` is pinned. */
export function marketByAccount(
  cluster: Cluster = DEFAULT_CLUSTER,
  poolName?: string
): Map<string, FlashMarket> {
  const map = new Map<string, FlashMarket>();
  for (const m of getAvailableMarkets(cluster, poolName)) map.set(m.marketAccount.toBase58(), m);
  return map;
}

/** A fixed-point value (BN or BigNumber) with `decimals` places → a JS number. */
export function bnToNumber(value: { toString(): string }, decimals: number): number {
  return new BigNumber(value.toString()).shiftedBy(-decimals).toNumber();
}

/** An OraclePrice `{ price, exponent }` → a JS number.
 *  `price` may be a BN/BigNumber; `exponent` a plain number or a BN. */
export function oraclePriceToNumber(op: {
  price: { toString(): string };
  exponent: number | { toNumber(): number };
}): number {
  const exponent =
    typeof op.exponent === 'number' ? op.exponent : op.exponent.toNumber();
  return new BigNumber(op.price.toString()).shiftedBy(exponent).toNumber();
}
