import {
  Commitment,
  Connection,
  GetAccountInfoConfig,
} from '@solana/web3.js';
import { Address, Parser, ParsedAccount, toPublicKey } from '../parse/types';

/**
 * Fetch and parse a **single** account by address, or `null` if it does not
 * exist. The parsed result carries its `pubkey` and `lamports`.
 *
 * This is the individual-fetch counterpart to {@link getParsedMultipleAccountInfo}
 * — it issues one `getAccountInfo` call rather than a batched read.
 */
export async function getParsedAccountInfo<T>(
  connection: Connection,
  parse: Parser<T>,
  address: Address,
  commitmentOrConfig?: Commitment | GetAccountInfoConfig
): Promise<ParsedAccount<T> | null> {
  const pubkey = toPublicKey(address);
  const accountInfo = await connection.getAccountInfo(
    pubkey,
    commitmentOrConfig
  );

  return accountInfo
    ? ({
        pubkey,
        lamports: accountInfo.lamports,
        ...parse(accountInfo.data),
      } as ParsedAccount<T>)
    : null;
}
