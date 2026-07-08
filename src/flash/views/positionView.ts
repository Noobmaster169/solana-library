import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { toPublicKey } from '../accounts/helpers/pdaAndDecode';
import { resolveTrade } from '../tx/tradeResolution';

// Shared by the position-metric views (PnL, position data, liquidation price):
// each simulates the matching on-chain view against ER state, so the owner must
// hold the position or the sim reverts.

export interface PositionRef {
  targetSymbol: string;
  side: 'long' | 'short';
  collateralSymbol?: string;
  poolName?: string;
}

/** Resolve the sdk, pool config, and view args shared by the position metrics. */
export function resolvePositionView(flash: FlashClient, owner: string | PublicKey, ref: PositionRef) {
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
