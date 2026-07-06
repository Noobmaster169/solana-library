import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/client';
import { deriveBasketAddress, toPublicKey } from './helpers/derive';
import { parseBasket, type BasketRaw } from './layouts';

// ---------------------------------------------------------------------------
// Read a wallet's Basket — the single account holding every position and order.
//
// Fully in-house: derive the Basket PDA, do ONE `getAccountInfo` on the ER
// (where delegated live state lives), and decode the bytes with our own parser.
// No SDK client, no AnchorProvider, no extra RPC. Returns `null` when the owner
// has no basket (or it isn't delegated to the ER yet — a basket with no
// positions to read anyway).
// ---------------------------------------------------------------------------

/** The decoded Basket for `owner`, or `null` if none exists on the ER. One RPC. */
export async function getBasket(
  flash: FlashClient,
  owner: string | PublicKey
): Promise<BasketRaw | null> {
  const address = deriveBasketAddress(toPublicKey(owner), flash.cluster);
  const info = await flash.erConnection.getAccountInfo(address);
  if (!info) return null;
  return parseBasket(info.data);
}
