import { PublicKey } from '@solana/web3.js';
import {
  BasketAccount,
  findBasketAddress,
  type Basket,
} from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { toPublicKey } from './helpers/derive';

// ---------------------------------------------------------------------------
// Read a wallet's Basket — the single account that holds every position and
// order for an owner.
//
// The Basket is delegated to the ER while trading, so live state lives on the
// ER validator: we read there first (one `getAccountInfo` via Anchor's
// `fetchNullable`, no throw when absent), and fall back to the base layer only
// if the ER has nothing — which covers a freshly-initialized, never-delegated
// basket. Returns `null` when the owner has no basket at all.
// ---------------------------------------------------------------------------

async function fetchBasketNullable(
  program: { account: Record<string, { fetchNullable(a: PublicKey): Promise<unknown> }> },
  address: PublicKey
): Promise<Basket | null> {
  return (await program.account['basket']!.fetchNullable(address)) as Basket | null;
}

/** The decoded Basket for `owner`, or `null` if none exists. One RPC in the common case. */
export async function getBasket(
  flash: FlashClient,
  owner: string | PublicKey
): Promise<BasketAccount | null> {
  const sdk = flash.sdk();
  const ownerPk = toPublicKey(owner);
  const [address] = findBasketAddress(ownerPk, sdk.programId);

  // ER holds live delegated state; base layer holds a never-delegated basket.
  const er = sdk.erProgram;
  let raw = er ? await fetchBasketNullable(er as never, address) : null;
  if (!raw) raw = await fetchBasketNullable(sdk.program as never, address);
  if (!raw) return null;

  return BasketAccount.from(address, raw);
}
