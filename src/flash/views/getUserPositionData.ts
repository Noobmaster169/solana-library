import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { resolvePositionView, type PositionRef } from './positionView';
import type { ViewResult } from './viewResult';

/** Full on-chain data (size, collateral, fees) for an open position (raw SDK result). */
export async function getUserPositionData(
  flash: FlashClient,
  owner: string | PublicKey,
  ref: PositionRef
): Promise<ViewResult> {
  const { sdk, pc, args } = resolvePositionView(flash, owner, ref);
  return sdk.views.getPositionData(pc, args);
}
