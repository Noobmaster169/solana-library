import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { resolvePositionView, type PositionRef } from './positionView';
import type { ViewResult } from './viewResult';

/** Realized/unrealized PnL breakdown for an open position (raw SDK result). */
export async function getUserPnl(
  flash: FlashClient,
  owner: string | PublicKey,
  ref: PositionRef
): Promise<ViewResult> {
  const { sdk, pc, args } = resolvePositionView(flash, owner, ref);
  return sdk.views.getPnl(pc, args);
}
