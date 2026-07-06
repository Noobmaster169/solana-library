import { Connection } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { Address } from '../parse/types';
import { parseMintAccount } from '../parse/structs';
import { getParsedAccountInfo } from '../accounts/getParsedAccountInfo';
import { NATIVE_SOL_MINT, WRAPPED_SOL_MINT } from './constants';

/**
 * Decimal-adjusted total supply of a mint (raw supply / 10^decimals).
 *
 * Returns `null` for native/wrapped SOL (no SPL mint to read) and for any mint
 * account that does not exist.
 */
export async function getSupply(
  connection: Connection,
  mint: Address
): Promise<BigNumber | null> {
  const mintStr = mint.toString();
  if (mintStr === NATIVE_SOL_MINT || mintStr === WRAPPED_SOL_MINT) return null;

  const mintAccount = await getParsedAccountInfo(
    connection,
    parseMintAccount,
    mint
  );
  return mintAccount
    ? mintAccount.supply.div(10 ** mintAccount.decimals)
    : null;
}
