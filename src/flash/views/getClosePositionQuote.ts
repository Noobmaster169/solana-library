import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { toPublicKey } from '../accounts/helpers/pdaAndDecode';
import { resolveTrade, toUsdAmount } from '../tx/tradeResolution';
import type { ViewResult } from './viewResult';

// Quote closing (all or part of) a position — a read-only ER simulation. The
// owner must have an open position in the market or the simulation reverts.

export interface ClosePositionQuoteParams {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Portion of the position to close, in USD. */
  sizeDeltaUsd: number;
  collateralSymbol?: string;
  /** Asset paid out; defaults to the market's collateral (lock) asset. */
  dispensingSymbol?: string;
  poolName?: string;
}

/** Quote closing a position. Returns the raw SDK result. */
export async function getClosePositionQuote(
  flash: FlashClient,
  owner: string | PublicKey,
  params: ClosePositionQuoteParams
): Promise<ViewResult> {
  const t = resolveTrade(flash, params);
  return t.sdk.views.getClosePositionQuote(t.pc, {
    owner: toPublicKey(owner),
    market: t.marketAccount,
    targetSymbol: t.targetSymbol,
    collateralSymbol: t.lockSymbol,
    dispensingSymbol: params.dispensingSymbol ?? t.lockSymbol,
    sizeDeltaUsd: toUsdAmount(params.sizeDeltaUsd),
  });
}
