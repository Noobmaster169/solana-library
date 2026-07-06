import { PublicKey } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// Shared Meteora DLMM (Liquidity Book) protocol constants.
//
// These are program-level and shared across every interaction layer
// (accounts/ today; api/ and tx/ later). Account-data layout sizes live next
// to the parsers in accounts/layouts.ts.
// ---------------------------------------------------------------------------

/** The DLMM program (same id on mainnet-beta and devnet). */
export const DLMM_PROGRAM_ID = new PublicKey(
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
);

/** Bins per `BinArray` account. A position spans at most two bin arrays. */
export const MAX_BIN_ARRAY_SIZE = 70;

/** Liquidity shares and per-token accumulators are Q64.64 fixed-point. */
export const SCALE_OFFSET = 64;

/** 100% expressed in basis points; `binStep` is given in bps. */
export const BASIS_POINT_MAX = 10000;
