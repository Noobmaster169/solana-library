import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { BufferReader } from '@solana';

// On-chain Flash Trade V2 `Basket` layout, transcribed field-for-field from the
// program IDL and decoded with BufferReader — no Anchor/SDK coder. Layout:
//
//   owner            pubkey
//   delegate         pubkey
//   basket_bump      u8
//   padding          [u8; 5]
//   positions_active bool
//   orders_active    bool
//   debits           Vec<Ledger>        (mint pubkey + u64 amount = 40 bytes)
//   pending_credits  Vec<Ledger>
//   positions        Vec<PositionMeta>  (market pubkey + Position = 272 bytes)
//   orders           Vec<OrderMeta>     (dynamic — not needed for positions)
//
// The two Ledger vecs are skipped by length to reach positions.

/** Anchor 8-byte account discriminator for `Basket` (sha256("account:Basket")[..8]). */
export const BASKET_DISCRIMINATOR = Buffer.from([
  219, 79, 107, 135, 231, 243, 218, 248,
]);

/** Serialized size of one `Ledger` entry: `mint` pubkey (32) + `amount` u64 (8). */
const LEDGER_SIZE = 40;

/** An on-chain `OraclePrice`: fixed-point `price` scaled by a signed `exponent`. */
export interface OraclePriceRaw {
  price: BigNumber;
  exponent: number;
}

/** One position, decoded from its `Position` struct (240 bytes). */
export interface PositionRaw {
  owner: PublicKey;
  market: PublicKey;
  delegate: PublicKey;
  openTime: number;
  updateTime: number;
  entryPrice: OraclePriceRaw;
  sizeAmount: BigNumber;
  sizeUsd: BigNumber;
  lockedAmount: BigNumber;
  lockedUsd: BigNumber;
  priceImpactUsd: BigNumber;
  collateralUsd: BigNumber;
  unsettledValueUsd: BigNumber;
  unsettledFeesUsd: BigNumber;
  cumulativeLockFeeSnapshot: BigNumber;
  degenSizeUsd: BigNumber;
  referencePrice: OraclePriceRaw;
  isActive: boolean;
  sizeDecimals: number;
  lockedDecimals: number;
  collateralDecimals: number;
  bump: number;
  migrateFlag: boolean;
}

/** A `PositionMeta`: the market this position belongs to + the position itself. */
export interface PositionMetaRaw {
  market: PublicKey;
  position: PositionRaw;
}

/** A decoded Basket account. Orders are not decoded (positions-focused reads). */
export interface BasketRaw {
  owner: PublicKey;
  delegate: PublicKey;
  positionsActive: boolean;
  ordersActive: boolean;
  positions: PositionMetaRaw[];
}

function readOraclePrice(r: BufferReader): OraclePriceRaw {
  return { 
    price: r.u64(), 
    exponent: r.i32() 
  };
}

function readPosition(r: BufferReader): PositionRaw {
  const owner = r.publicKey();
  const market = r.publicKey();
  const delegate = r.publicKey();
  const openTime = r.i64().toNumber();
  const updateTime = r.i64().toNumber();
  const entryPrice = readOraclePrice(r);
  const sizeAmount = r.u64();
  const sizeUsd = r.u64();
  const lockedAmount = r.u64();
  const lockedUsd = r.u64();
  const priceImpactUsd = r.u64();
  const collateralUsd = r.u64();
  const unsettledValueUsd = r.u64();
  const unsettledFeesUsd = r.u64();
  const cumulativeLockFeeSnapshot = r.u128();
  const degenSizeUsd = r.u64();
  const referencePrice = readOraclePrice(r);
  const isActive = r.bool();
  r.skip(2); // buffer: [u8; 2]
  r.skip(1); // price_impact_set: u8
  const sizeDecimals = r.u8();
  const lockedDecimals = r.u8();
  const collateralDecimals = r.u8();
  const bump = r.u8();
  const migrateFlag = r.bool();
  r.skip(7); // padding: [u8; 7]
  return {
    owner,
    market,
    delegate,
    openTime,
    updateTime,
    entryPrice,
    sizeAmount,
    sizeUsd,
    lockedAmount,
    lockedUsd,
    priceImpactUsd,
    collateralUsd,
    unsettledValueUsd,
    unsettledFeesUsd,
    cumulativeLockFeeSnapshot,
    degenSizeUsd,
    referencePrice,
    isActive,
    sizeDecimals,
    lockedDecimals,
    collateralDecimals,
    bump,
    migrateFlag,
  };
}

/** Decode a Basket account's raw bytes into positions. Verifies the discriminator. */
export function parseBasket(data: Buffer): BasketRaw {
  if (!data.subarray(0, 8).equals(BASKET_DISCRIMINATOR)) {
    throw new Error('not a Flash Basket account (discriminator mismatch)');
  }
  const r = new BufferReader(data, 8);

  const owner = r.publicKey();
  const delegate = r.publicKey();
  r.skip(1); // basket_bump: u8
  r.skip(5); // padding: [u8; 5]
  const positionsActive = r.bool();
  const ordersActive = r.bool();

  // Skip debits and pending_credits (Vec<Ledger>) to reach positions.
  r.skip(r.u32() * LEDGER_SIZE);
  r.skip(r.u32() * LEDGER_SIZE);

  const positionCount = r.u32();
  const positions: PositionMetaRaw[] = [];
  for (let i = 0; i < positionCount; i++) {
    positions.push({ market: r.publicKey(), position: readPosition(r) });
  }

  return { owner, delegate, positionsActive, ordersActive, positions };
}
