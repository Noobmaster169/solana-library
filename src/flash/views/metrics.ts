import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/client';
import { oraclePriceToNumber, toPublicKey } from '../accounts/helpers/derive';
import { resolveTrade } from '../tx/common';
import type { ViewResult } from './types';

// ---------------------------------------------------------------------------
// Live metrics for an OPEN position — PnL, liquidation price, full position
// data. Each simulates the matching on-chain view against ER state, so the
// owner must actually hold the position or the sim reverts. Market/lock
// resolution matches the tx builders.
// ---------------------------------------------------------------------------

export interface PositionRef {
  targetSymbol: string;
  side: 'long' | 'short';
  collateralSymbol?: string;
  poolName?: string;
}

function args(flash: FlashClient, owner: string | PublicKey, ref: PositionRef) {
  const t = resolveTrade(flash, ref);
  return {
    sdk: t.sdk,
    pc: t.pc,
    args: {
      owner: toPublicKey(owner),
      market: t.marketAccount,
      targetSymbol: t.targetSymbol,
      collateralSymbol: t.lockSymbol,
    },
  };
}

/** Realized/unrealized PnL breakdown for a position (raw SDK result). */
export async function getPnl(
  flash: FlashClient,
  owner: string | PublicKey,
  ref: PositionRef
): Promise<ViewResult> {
  const { sdk, pc, args: a } = args(flash, owner, ref);
  return sdk.views.getPnl(pc, a);
}

/** Full on-chain position data (size, collateral, fees; raw SDK result). */
export async function getPositionData(
  flash: FlashClient,
  owner: string | PublicKey,
  ref: PositionRef
): Promise<ViewResult> {
  const { sdk, pc, args: a } = args(flash, owner, ref);
  return sdk.views.getPositionData(pc, a);
}

/** Estimated liquidation price (USD) for a position. */
export async function getLiquidationPrice(
  flash: FlashClient,
  owner: string | PublicKey,
  ref: PositionRef
): Promise<number> {
  const { sdk, pc, args: a } = args(flash, owner, ref);
  const op = await sdk.views.getLiquidationPrice(pc, a);
  return oraclePriceToNumber(op);
}
