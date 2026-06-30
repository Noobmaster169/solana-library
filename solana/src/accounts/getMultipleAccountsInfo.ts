import {
  AccountInfo,
  Commitment,
  Connection,
  GetMultipleAccountsConfig,
} from '@solana/web3.js';
import { Address, toPublicKey } from '../parse/types';

/** The RPC caps `getMultipleAccounts` at 100 keys per request. */
const MAX_ACCOUNTS_PER_CALL = 100;

/**
 * Fetch many accounts in one logical call, transparently chunked at the RPC's
 * 100-key limit. Results are returned **positionally aligned** to the input:
 * `result[i]` is the account for `addresses[i]`, or `null` if it does not
 * exist. Order is never reshuffled.
 */
export async function getMultipleAccountsInfo(
  connection: Connection,
  addresses: Address[],
  commitmentOrConfig?: Commitment | GetMultipleAccountsConfig
): Promise<(AccountInfo<Buffer> | null)[]> {
  const publicKeys = addresses.map(toPublicKey);

  if (publicKeys.length <= MAX_ACCOUNTS_PER_CALL) {
    return connection.getMultipleAccountsInfo(publicKeys, commitmentOrConfig);
  }

  const accountsInfo: (AccountInfo<Buffer> | null)[] = [];
  for (let i = 0; i < publicKeys.length; i += MAX_ACCOUNTS_PER_CALL) {
    const chunk = publicKeys.slice(i, i + MAX_ACCOUNTS_PER_CALL);
    // eslint-disable-next-line no-await-in-loop
    const res = await connection.getMultipleAccountsInfo(
      chunk,
      commitmentOrConfig
    );
    accountsInfo.push(...res);
  }
  return accountsInfo;
}
