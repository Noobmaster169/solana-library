import { Connection, PublicKey } from '@solana/web3.js';
import { Address, Parser, ParsedAccount } from '../parse/types';
import {
  GetProgramAccountsOptions,
  getProgramAccounts,
} from './getProgramAccounts';

/** `getProgramAccounts` + parsing into `ParsedAccount<T>[]`. */
export async function getParsedProgramAccounts<T>(
  connection: Connection,
  parse: Parser<T>,
  programId: Address,
  options: GetProgramAccountsOptions = {}
): Promise<ParsedAccount<T>[]> {
  const accountsRes = await getProgramAccounts(connection, programId, options);
  return accountsRes.map(
    (accountRes) =>
      ({
        pubkey: accountRes.pubkey as PublicKey,
        lamports: accountRes.account.lamports,
        ...parse(accountRes.account.data),
      } as ParsedAccount<T>)
  );
}
