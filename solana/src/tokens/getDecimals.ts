import { Connection } from '@solana/web3.js';
import { Address } from '../parse/types';
import { parseMintAccount } from '../parse/structs';
import { getParsedAccounts } from '../accounts/getParsedAccounts';
import { NATIVE_SOL_MINT, SOL_DECIMALS, WRAPPED_SOL_MINT } from './constants';

/**
 * Resolve mint decimals in one batched read, keyed by mint address. Native and
 * wrapped SOL are answered locally (9) without an RPC hit; unknown mints are
 * simply absent from the map.
 */
export async function getDecimalsAsMap(
  connection: Connection,
  mints: Address[]
): Promise<Map<string, number>> {
  const decimals = new Map<string, number>();
  const toFetch = new Set<string>();

  mints.forEach((m) => {
    const mint = m.toString();
    if (mint === NATIVE_SOL_MINT || mint === WRAPPED_SOL_MINT) {
      decimals.set(mint, SOL_DECIMALS);
    } else {
      toFetch.add(mint);
    }
  });

  const addresses = Array.from(toFetch);
  const mintAccounts = await getParsedAccounts(
    connection,
    parseMintAccount,
    addresses
  );
  mintAccounts.forEach((acc) => {
    if (!acc) return;
    decimals.set(acc.pubkey.toString(), acc.decimals);
  });

  return decimals;
}

/**
 * Decimals for each mint, **positionally aligned** to the input array. `null`
 * for mints that could not be resolved.
 */
export async function getDecimals(
  connection: Connection,
  mints: Address[]
): Promise<(number | null)[]> {
  const map = await getDecimalsAsMap(connection, mints);
  return mints.map((m) => map.get(m.toString()) ?? null);
}
