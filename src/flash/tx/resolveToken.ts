import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { getSupportedTokens, type FlashToken } from '../markets';
import { toPublicKey } from '../accounts/helpers/pdaAndDecode';

// Shared by the deposit/withdraw builders: find a collateral token in the pool
// registry by symbol or mint.

/** Resolve a collateral token by symbol (case-insensitive) or mint from the pool registry. */
export function resolveToken(
  flash: FlashClient,
  token: string | PublicKey,
  poolName?: string
): FlashToken {
  const tokens = getSupportedTokens(flash.cluster, poolName);
  const found =
    (typeof token === 'string'
      ? tokens.find((x) => x.symbol.toUpperCase() === token.toUpperCase())
      : undefined) ?? tokens.find((x) => x.mint.equals(toPublicKey(token)));
  if (!found) throw new Error(`token not found in pool registry: ${token}`);
  return found;
}
