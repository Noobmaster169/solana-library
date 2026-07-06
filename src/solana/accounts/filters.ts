import { GetProgramAccountsFilter, PublicKey } from '@solana/web3.js';
import { Address } from '../parse/types';

/**
 * `getProgramAccounts` filter builders. These keep call sites declarative:
 * `getProgramAccounts(conn, programId, { filters: [dataSizeFilter(165), memcmpFilter(32, owner)] })`.
 */

/** Match accounts whose data is exactly `size` bytes. */
export const dataSizeFilter = (size: number): GetProgramAccountsFilter => ({
  dataSize: size,
});

/**
 * Match a byte sequence at a given offset. Accepts a base58 string, a
 * `PublicKey` (matched as its 32 bytes), or a raw `Buffer` (base58-encoded for
 * the RPC, as web3.js expects).
 */
export const memcmpFilter = (
  offset: number,
  bytes: Address | Buffer
): GetProgramAccountsFilter => {
  let encoded: string;
  if (typeof bytes === 'string') encoded = bytes;
  else if (bytes instanceof PublicKey) encoded = bytes.toBase58();
  else encoded = new PublicKey(bytes).toBase58();
  return { memcmp: { offset, bytes: encoded } };
};
