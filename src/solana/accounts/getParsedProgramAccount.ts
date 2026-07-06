import { Connection } from '@solana/web3.js';
import { Address, Parser, ParsedAccount } from '../parse/types';
import { GetProgramAccountsOptions } from './getProgramAccounts';
import { getParsedProgramAccounts } from './getParsedProgramAccounts';

/**
 * Fetch and parse the **first** account owned by a program that matches
 * `options`, or `null` if none match. The parsed-struct counterpart to
 * {@link getProgramAccount} — ideal for a singleton/config account.
 */
export async function getParsedProgramAccount<T>(
  connection: Connection,
  parse: Parser<T>,
  programId: Address,
  options: GetProgramAccountsOptions = {}
): Promise<ParsedAccount<T> | null> {
  const [first] = await getParsedProgramAccounts(
    connection,
    parse,
    programId,
    options
  );
  return first ?? null;
}
