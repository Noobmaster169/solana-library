import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { BufferReader } from './reader';

/**
 * The two SPL layouts you reach for constantly. A "struct" here is just a
 * function that walks the buffer in field order — read it top to bottom and it
 * mirrors the on-chain layout exactly.
 *
 * Both are the legacy SPL Token layout; the first 165/82 bytes of a Token-2022
 * account share the same field order, so these parse Token-2022 accounts too
 * (extensions live past the base layout).
 */

export type MintAccount = {
  mintAuthorityOption: number;
  mintAuthority: PublicKey;
  supply: BigNumber;
  decimals: number;
  initialized: boolean;
  freezeAuthorityOption: number;
  freezeAuthority: PublicKey;
};

export const MINT_ACCOUNT_SIZE = 82;

export function parseMintAccount(data: Buffer): MintAccount {
  const r = new BufferReader(data);
  return {
    mintAuthorityOption: r.u32(),
    mintAuthority: r.publicKey(),
    supply: r.u64(),
    decimals: r.u8(),
    initialized: r.bool(),
    freezeAuthorityOption: r.u32(),
    freezeAuthority: r.publicKey(),
  };
}

export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2,
}

export type TokenAccount = {
  mint: PublicKey;
  owner: PublicKey;
  amount: BigNumber;
  delegateOption: number;
  delegate: PublicKey;
  state: AccountState;
  isNativeOption: number;
  isNative: BigNumber;
  delegatedAmount: BigNumber;
  closeAuthorityOption: number;
  closeAuthority: PublicKey;
};

export const TOKEN_ACCOUNT_SIZE = 165;

export function parseTokenAccount(data: Buffer): TokenAccount {
  const r = new BufferReader(data);
  return {
    mint: r.publicKey(),
    owner: r.publicKey(),
    amount: r.u64(),
    delegateOption: r.u32(),
    delegate: r.publicKey(),
    state: r.u8(),
    isNativeOption: r.u32(),
    isNative: r.u64(),
    delegatedAmount: r.u64(),
    closeAuthorityOption: r.u32(),
    closeAuthority: r.publicKey(),
  };
}
