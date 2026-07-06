import { Keypair } from '@solana/web3.js';
import { StrategyType } from '@meteora-ag/dlmm';
import {
  estimateDlmmDirectSwap,
  estimateDlmmIndirectSwap,
} from '@meteora-ag/zap-sdk';
import type { MeteoraClient } from '../../client/client';
import { resolveOpenRoute } from './route';
import { withDlmmCache } from './poolCache';
import type { BundleTx, DlmmZapBundle, OpenDlmmPositionParams } from './types';

/**
 * Open a DLMM position from a single input token. Swaps part of `inputMint` to
 * balance the position (via the DLMM pool for `route: 'dlmm'`, via Jupiter for
 * `route: 'jupiter'`), then opens a fresh position. Returns an ordered,
 * unsigned bundle plus the generated position keypair to co-sign.
 */
export function openDlmmPosition(
  client: MeteoraClient,
  params: OpenDlmmPositionParams
): Promise<DlmmZapBundle> {
  return withDlmmCache(() => openDlmmPositionInner(client, params));
}

async function openDlmmPositionInner(
  client: MeteoraClient,
  params: OpenDlmmPositionParams
): Promise<DlmmZapBundle> {
  const {
    lbPair,
    inputMint,
    amount,
    user,
    minDeltaId,
    maxDeltaId,
    strategy = StrategyType.Spot,
    route = 'auto',
    swapSlippageBps = 150,
    maxActiveBinSlippage = 50,
    maxAccounts = 50,
    favorXInActiveId = false,
  } = params;

  const resolved = await resolveOpenRoute(client, lbPair, inputMint, route);
  const config = {
    jupiterApiUrl: client.jupiterApiUrl,
    jupiterApiKey: client.jupiterApiKey,
  };
  if (resolved === 'jupiter' && !client.jupiterApiKey) {
    throw new Error(
      'Jupiter route requires a Jupiter API key (set JUPITER_API_KEY or pass jupiterApiKey).'
    );
  }

  const zap = client.zap();
  const position = Keypair.generate();

  let built;
  if (resolved === 'dlmm') {
    const estimate = await estimateDlmmDirectSwap({
      amountIn: amount,
      inputTokenMint: inputMint,
      lbPair,
      connection: client.connection,
      swapSlippageBps,
      minDeltaId,
      maxDeltaId,
      strategy,
      config,
    });
    const buildParams = await zap.getZapInDlmmDirectParams({
      user,
      lbPair,
      inputTokenMint: inputMint,
      amountIn: amount,
      maxActiveBinSlippage,
      minDeltaId,
      maxDeltaId,
      strategy,
      favorXInActiveId,
      maxAccounts,
      swapSlippageBps,
      maxTransferAmountExtendPercentage: 0,
      directSwapEstimate: estimate.result,
    });
    built = await zap.buildZapInDlmmTransaction({
      ...buildParams,
      position: position.publicKey,
    });
  } else {
    const estimate = await estimateDlmmIndirectSwap({
      amountIn: amount,
      inputTokenMint: inputMint,
      lbPair,
      connection: client.connection,
      swapSlippageBps,
      minDeltaId,
      maxDeltaId,
      strategy,
      config,
    });
    const buildParams = await zap.getZapInDlmmIndirectParams({
      user,
      lbPair,
      inputTokenMint: inputMint,
      amountIn: amount,
      maxActiveBinSlippage,
      minDeltaId,
      maxDeltaId,
      strategy,
      favorXInActiveId,
      maxAccounts,
      swapSlippageBps,
      maxTransferAmountExtendPercentage: 0,
      indirectSwapEstimate: estimate.result,
    });
    built = await zap.buildZapInDlmmTransaction({
      ...buildParams,
      position: position.publicKey,
    });
  }

  const transactions: BundleTx[] = [];
  if (built.setupTransaction) {
    transactions.push({ label: 'setup', transaction: built.setupTransaction });
  }
  for (const swap of built.swapTransactions) {
    transactions.push({ label: 'swap', transaction: swap });
  }
  transactions.push({ label: 'ledger', transaction: built.ledgerTransaction });
  transactions.push({ label: 'main', transaction: built.zapInTransaction });
  transactions.push({ label: 'cleanup', transaction: built.cleanUpTransaction });

  return {
    transactions,
    position: { publicKey: position.publicKey, keypair: position },
    route: resolved,
  };
}
