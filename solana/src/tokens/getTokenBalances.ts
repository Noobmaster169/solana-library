import { Connection } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { Address, toPublicKey } from '../parse/types';
import { parseTokenAccount } from '../parse/structs';
import { getMultipleAccounts } from '../accounts/getMultipleAccounts';
import { getAssociatedTokenAddress } from './ata';
import { TOKEN_PROGRAM_IDS } from './constants';

export type TokenBalance = {
  mint: string;
  owner: string;
  /** The associated token account holding the balance. */
  address: string;
  /** The token program that owns the account (legacy Token or Token-2022). */
  tokenProgramId: string;
  /** Raw on-chain amount, not adjusted for decimals. */
  amount: BigNumber;
};

/**
 * Fetch an owner's balances for a specific list of mints in a single batched
 * read.
 *
 * For each mint the ATA is derived under both the legacy Token program and
 * Token-2022, and all candidates are resolved with one chunked
 * `getMultipleAccounts` call — so the caller never needs to know which program
 * a mint belongs to. Whichever account exists wins.
 *
 * Returns a map keyed by mint address. Mints with no account (or a zero
 * balance) are omitted unless `includeZero` is set.
 */
export async function getTokenBalances(
  connection: Connection,
  owner: Address,
  mints: Address[],
  options: { includeZero?: boolean } = {}
): Promise<Map<string, TokenBalance>> {
  const ownerPk = toPublicKey(owner);

  const uniqueMints = Array.from(new Set(mints.map((m) => m.toString())));

  // One candidate ATA per (mint, token program); remember the mapping back.
  const candidates = uniqueMints.flatMap((mint) =>
    TOKEN_PROGRAM_IDS.map((tokenProgramId) => ({
      mint,
      tokenProgramId,
      address: getAssociatedTokenAddress(ownerPk, mint, tokenProgramId),
    }))
  );

  const accountsInfo = await getMultipleAccounts(
    connection,
    candidates.map((c) => c.address)
  );

  const balances = new Map<string, TokenBalance>();
  accountsInfo.forEach((accountInfo, i) => {
    if (!accountInfo) return;
    const { mint, tokenProgramId, address } = candidates[i];
    const { amount } = parseTokenAccount(accountInfo.data);
    if (!options.includeZero && amount.isZero()) return;
    balances.set(mint, {
      mint,
      owner: ownerPk.toString(),
      address: address.toString(),
      tokenProgramId: tokenProgramId.toString(),
      amount,
    });
  });

  return balances;
}
