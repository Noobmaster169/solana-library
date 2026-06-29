import { Connection } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { Address, toPublicKey } from '../parse/types';
import { TOKEN_PROGRAM_IDS } from './constants';
import { TokenBalance } from './getTokenBalances';

/**
 * An owned token balance, enriched with the mint's `decimals` and the
 * decimals-adjusted `uiAmount`. Carries the raw `amount` too, plus the ATA
 * `address` and `tokenProgramId` so write paths can act on the right account
 * and program.
 */
export type OwnedTokenBalance = TokenBalance & {
  decimals: number;
  /** `amount` adjusted for `decimals` (i.e. the human-readable balance). */
  uiAmount: number;
};

/**
 * Enumerate **all** of an owner's token holdings across **both** SPL token
 * programs (legacy Token and Token-2022) in a single logical call. Use this when
 * the set of mints is not known up front (wallet sweeps, full-balance views) —
 * unlike `getTokenBalances`, which requires a mint list.
 *
 * Returns a map keyed by mint address. Zero-balance accounts are omitted unless
 * `includeZero` is set. When the same mint is somehow held under both programs,
 * the first program in `TOKEN_PROGRAM_IDS` (legacy) wins.
 */
export async function getAllTokenBalances(
  connection: Connection,
  owner: Address,
  options: { includeZero?: boolean } = {}
): Promise<Map<string, OwnedTokenBalance>> {
  const ownerPk = toPublicKey(owner);

  // One `getParsedTokenAccountsByOwner` per program — parsed RPC is the only way
  // to discover unknown mints. A failure on one program must not hide the other.
  const perProgram = await Promise.all(
    TOKEN_PROGRAM_IDS.map((tokenProgramId) =>
      connection
        .getParsedTokenAccountsByOwner(ownerPk, { programId: tokenProgramId })
        .then((res) => ({ tokenProgramId, accounts: res.value }))
    )
  );

  const balances = new Map<string, OwnedTokenBalance>();
  for (const { tokenProgramId, accounts } of perProgram) {
    for (const { pubkey, account } of accounts) {
      const info = account.data.parsed?.info;
      if (!info?.mint || !info?.tokenAmount) continue;

      const mint: string = info.mint;
      if (balances.has(mint)) continue; // legacy program wins on collision

      const amount = new BigNumber(info.tokenAmount.amount ?? '0');
      if (!options.includeZero && amount.isZero()) continue;

      balances.set(mint, {
        mint,
        owner: ownerPk.toString(),
        address: pubkey.toString(),
        tokenProgramId: tokenProgramId.toString(),
        amount,
        decimals: info.tokenAmount.decimals,
        uiAmount: info.tokenAmount.uiAmount ?? 0,
      });
    }
  }

  return balances;
}
