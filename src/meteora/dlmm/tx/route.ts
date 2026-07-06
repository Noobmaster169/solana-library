import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { getJupiterQuote, type JupiterQuoteResponse } from '@meteora-ag/zap-sdk';
import type { MeteoraClient } from '../../client/client';
import { getPool } from './poolCache';
import type { RoutePreference, ZapRoute } from './types';

/**
 * Open route: DLMM-direct is only valid when the input mint is one side of the
 * pool. 'auto' picks direct when possible, else Jupiter (which routes any mint).
 */
export async function resolveOpenRoute(
  client: MeteoraClient,
  lbPair: PublicKey,
  inputMint: PublicKey,
  pref: RoutePreference
): Promise<ZapRoute> {
  if (pref === 'dlmm' || pref === 'jupiter') return pref;
  const dlmm = await getPool(client.connection, lbPair);
  const isSide =
    inputMint.equals(dlmm.lbPair.tokenXMint) ||
    inputMint.equals(dlmm.lbPair.tokenYMint);
  return isSide ? 'dlmm' : 'jupiter';
}

/**
 * Close/zap-out route: 'auto' quotes both DLMM (on-chain) and Jupiter, tolerates
 * one failing, and picks the larger out amount. Returns the Jupiter quote when
 * that route wins so the builder does not re-fetch.
 */
export async function resolveZapOutRoute(
  client: MeteoraClient,
  lbPair: PublicKey,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amountIn: BN,
  slippageBps: number,
  pref: RoutePreference
): Promise<{ route: ZapRoute; jupiterQuote: JupiterQuoteResponse | null }> {
  const dlmm = await getPool(client.connection, lbPair);
  const swapForY = inputMint.equals(dlmm.lbPair.tokenXMint);

  // getJupiterQuote positional args:
  // (inputMint, outputMint, amount, maxAccounts, slippageBps, dynamicSlippage,
  //  onlyDirectRoutes, restrictIntermediateTokens, forJitoBundle?, config?)
  const jupiter = () =>
    getJupiterQuote(
      inputMint,
      outputMint,
      amountIn,
      50,
      slippageBps,
      false,
      true,
      true,
      false,
      { jupiterApiUrl: client.jupiterApiUrl, jupiterApiKey: client.jupiterApiKey }
    );

  if (pref === 'jupiter') {
    if (!client.jupiterApiKey) {
      throw new Error(
        'Jupiter route requires a Jupiter API key (set JUPITER_API_KEY or pass jupiterApiKey).'
      );
    }
    return { route: 'jupiter', jupiterQuote: await jupiter() };
  }
  if (pref === 'dlmm') return { route: 'dlmm', jupiterQuote: null };

  // auto: quote both, pick best out.
  const [dlmmRes, jupRes] = await Promise.allSettled([
    dlmm
      .getBinArrayForSwap(swapForY, 5)
      .then((arrs) => dlmm.swapQuote(amountIn, swapForY, new BN(slippageBps), arrs)),
    client.jupiterApiKey ? jupiter() : Promise.resolve(null),
  ]);

  // dlmm SwapQuote.outAmount is a BN; Jupiter's outAmount is a decimal string.
  const dlmmOut: BN | null =
    dlmmRes.status === 'fulfilled' ? dlmmRes.value.outAmount : null;
  const jupQuote = jupRes.status === 'fulfilled' ? jupRes.value : null;
  const jupOut: BN | null = jupQuote ? new BN(jupQuote.outAmount) : null;

  if (!dlmmOut && !jupOut) {
    throw new Error(
      `No zap-out quote available (dlmm: ${
        dlmmRes.status === 'rejected' ? String(dlmmRes.reason) : 'no out'
      }; jupiter: ${jupRes.status === 'rejected' ? String(jupRes.reason) : 'no out'}).`
    );
  }
  if (jupOut && (!dlmmOut || jupOut.gt(dlmmOut))) {
    return { route: 'jupiter', jupiterQuote: jupQuote };
  }
  return { route: 'dlmm', jupiterQuote: null };
}
