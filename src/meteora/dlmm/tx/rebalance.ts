import { StrategyType } from '@meteora-ag/dlmm';
import { estimateDlmmRebalanceSwap } from '@meteora-ag/zap-sdk';
import type { MeteoraClient } from '../../client/client';
import { withDlmmCache } from './poolCache';
import type {
  BundleTx,
  DlmmZapBundle,
  RebalanceDlmmPositionParams,
} from './types';

/**
 * Rebalance an existing DLMM position in place: remove its liquidity, zap out,
 * and zap back into a new bin range. Operates on the given `position` (no new
 * position NFT is minted). Returns an unsigned ordered bundle.
 */
export function rebalanceDlmmPosition(
  client: MeteoraClient,
  params: RebalanceDlmmPositionParams
): Promise<DlmmZapBundle> {
  return withDlmmCache(() => rebalanceDlmmPositionInner(client, params));
}

async function rebalanceDlmmPositionInner(
  client: MeteoraClient,
  params: RebalanceDlmmPositionParams
): Promise<DlmmZapBundle> {
  const {
    lbPair,
    position,
    user,
    minDeltaId,
    maxDeltaId,
    strategy = StrategyType.Spot,
    swapSlippageBps = 150,
    liquiditySlippageBps = 150,
    maxAccounts = 50,
    favorXInActiveId = false,
  } = params;

  const estimate = await estimateDlmmRebalanceSwap({
    position,
    lbPair,
    connection: client.connection,
    minDeltaId,
    maxDeltaId,
    swapSlippageBps,
    strategy,
    config: {
      jupiterApiUrl: client.jupiterApiUrl,
      jupiterApiKey: client.jupiterApiKey,
    },
  });

  const built = await client.zap().rebalanceDlmmPosition({
    lbPair,
    position,
    user,
    minDeltaId,
    maxDeltaId,
    liquiditySlippageBps,
    swapSlippageBps,
    strategy,
    favorXInActiveId,
    directSwapEstimate: estimate.result,
    maxAccounts,
  });

  // RebalanceDlmmPositionResponse has optional setup / initBinArray / rebalance /
  // swap transactions plus required ledger / zapIn / cleanup. Emit in order.
  const transactions: BundleTx[] = [];
  if (built.setupTransaction) {
    transactions.push({ label: 'setup', transaction: built.setupTransaction });
  }
  if (built.initBinArrayTransaction) {
    transactions.push({
      label: 'initBinArray',
      transaction: built.initBinArrayTransaction,
    });
  }
  if (built.rebalancePositionTransaction) {
    transactions.push({
      label: 'rebalance',
      transaction: built.rebalancePositionTransaction,
    });
  }
  if (built.swapTransaction) {
    transactions.push({ label: 'swap', transaction: built.swapTransaction });
  }
  transactions.push({ label: 'ledger', transaction: built.ledgerTransaction });
  transactions.push({ label: 'main', transaction: built.zapInTransaction });
  transactions.push({ label: 'cleanup', transaction: built.cleanUpTransaction });

  // Rebalance reuses the existing position — no `position` field on the bundle.
  return { transactions, route: 'dlmm' };
}
