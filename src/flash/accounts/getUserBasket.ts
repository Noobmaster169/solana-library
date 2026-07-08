import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { deriveBasketAddress, toPublicKey } from './helpers/pdaAndDecode';
import { parseBasket, type BasketRaw } from './basketLayout';

// Read a wallet's Basket — the single account holding every position and order.
// Derive the PDA, do ONE ER `getAccountInfo`, decode with our own parser. Null
// when the owner has no basket (or it isn't delegated to the ER yet).

/** The decoded Basket for `owner`, or `null` if none exists on the ER. One RPC. */
export async function getUserBasket(
  flash: FlashClient,
  owner: string | PublicKey
): Promise<BasketRaw | null> {
  const address = deriveBasketAddress(toPublicKey(owner), flash.cluster);
  const info = await flash.erConnection.getAccountInfo(address);
  if (!info) return null;
  return parseBasket(info.data);
}
