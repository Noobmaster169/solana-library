import { PublicKey } from '@solana/web3.js';

/**
 * A parsed account: the decoded data `T` plus the on-chain metadata every
 * account carries. Returned by every parsed-fetch helper so the caller always
 * knows which key produced the data and how many lamports it holds.
 */
export type ParsedAccount<T> = T & {
  pubkey: PublicKey;
  lamports: number;
};

/**
 * A parser turns raw account bytes into a typed value. Any function of this
 * shape works with the fetch helpers — typically one built with `BufferReader`
 * (see `parseTokenAccount`), but anything that maps a `Buffer` to `T` is fine.
 */
export type Parser<T> = (data: Buffer) => T;

/** Anything that can be normalized to a PublicKey. */
export type Address = PublicKey | string;

/** Normalize a `PublicKey | string` to a `PublicKey`. */
export function toPublicKey(address: Address): PublicKey {
  return typeof address === 'string' ? new PublicKey(address) : address;
}
