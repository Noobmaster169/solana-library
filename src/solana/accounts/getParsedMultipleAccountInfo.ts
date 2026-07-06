import {
  Commitment,
  Connection,
  GetMultipleAccountsConfig,
} from '@solana/web3.js';
import { getMultipleAccountsInfo } from './getMultipleAccountsInfo';
import { Address, Parser, ParsedAccount, toPublicKey } from '../parse/types';

/**
 * Fetch and parse **many** accounts in one chunked call. Results are
 * positionally aligned to `addresses`; entries for missing accounts are `null`.
 * Each parsed result carries its `pubkey` and `lamports`.
 */
export async function getParsedMultipleAccountInfo<T>(
  connection: Connection,
  parse: Parser<T>,
  addresses: Address[],
  commitmentOrConfig?: Commitment | GetMultipleAccountsConfig
): Promise<(ParsedAccount<T> | null)[]> {
  const publicKeys = addresses.map(toPublicKey);
  const accountsInfo = await getMultipleAccountsInfo(
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
