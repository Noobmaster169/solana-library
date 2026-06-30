import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { Address } from '../parse/types';
import {
  GetProgramAccountsOptions,
  getProgramAccounts,
} from './getProgramAccounts';

/**
 * Fetch the **first** raw account owned by a program that matches `options`, or
 * `null` if none match. A thin convenience over {@link getProgramAccounts} for
 * the common case of a singleton/config account selected by filters.
 *
 * Pair with `maxAccounts: 1` if you want to guard against the program returning
 * more matches than expected.
 */
export async function getProgramAccount(
  connection: Connection,
  programId: Address,
  options: GetProgramAccountsOptions = {}
): Promise<{ pubkey: PublicKey; account: AccountInfo<Buffer> } | null> {
  const [first] = await getProgramAccounts(connection, programId, options);
  return first ?? null;
}
