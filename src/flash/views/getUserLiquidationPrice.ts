import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { oraclePriceToNumber } from '../accounts/helpers/pdaAndDecode';
import { resolvePositionView, type PositionRef } from './positionView';

/** Estimated liquidation price (USD) for an open position. */
export async function getUserLiquidationPrice(
  flash: FlashClient,
  owner: string | PublicKey,
  ref: PositionRef
): Promise<number> {
  const { sdk, pc, args } = resolvePositionView(flash, owner, ref);
  return oraclePriceToNumber(await sdk.views.getLiquidationPrice(pc, args));
}
