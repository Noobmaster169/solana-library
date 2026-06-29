import {
  Commitment,
  Connection,
  GetMultipleAccountsConfig,
} from '@solana/web3.js';
import { getMultipleAccounts } from './getMultipleAccounts';
import { Address, Parser, ParsedAccount, toPublicKey } from '../parse/types';

/**
 * Fetch and parse many accounts in one chunked call. Results are positionally
 * aligned to `addresses`; entries for missing accounts are `null`. Each parsed
 * result carries its `pubkey` and `lamports`.
 */
export async function getParsedAccounts<T>(
  connection: Connection,
  parse: Parser<T>,
  addresses: Address[],
  commitmentOrConfig?: Commitment | GetMultipleAccountsConfig
): Promise<(ParsedAccount<T> | null)[]> {
  const publicKeys = addresses.map(toPublicKey);
  const accountsInfo = await getMultipleAccounts(
    connection,
    publicKeys,
    commitmentOrConfig
  );

  return accountsInfo.map((accountInfo, i) =>
    accountInfo
      ? ({
          pubkey: publicKeys[i],
          lamports: accountInfo.lamports,
          ...parse(accountInfo.data),
        } as ParsedAccount<T>)
      : null
  );
}

/** Fetch and parse a single account, or `null` if it does not exist. */
export async function getParsedAccount<T>(
  connection: Connection,
  parse: Parser<T>,
  address: Address,
  commitmentOrConfig?: Commitment | GetMultipleAccountsConfig
): Promise<ParsedAccount<T> | null> {
  const [account] = await getParsedAccounts(
    connection,
    parse,
    [address],
    commitmentOrConfig
  );
  return account;
}
