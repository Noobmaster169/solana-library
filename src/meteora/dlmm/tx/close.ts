import { Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { getTokenProgramId } from '@meteora-ag/dlmm';
import { getJupiterSwapInstruction } from '@meteora-ag/zap-sdk';
import type { MeteoraClient } from '../../client/client';
import { resolveZapOutRoute } from './route';
import { getPool, withDlmmCache } from './poolCache';
import type { BundleTx, CloseDlmmPositionParams, DlmmZapBundle } from './types';

/**
 * Close a DLMM position: remove liquidity (claim + close) via the DLMM SDK,
 * then zap the withdrawn tokens into a single `outputMint` — through the DLMM
 * pool or Jupiter, whichever gives more. Returns an unsigned ordered bundle.
 */
export function closeDlmmPosition(
  client: MeteoraClient,
  params: CloseDlmmPositionParams
): Promise<DlmmZapBundle> {
  return withDlmmCache(() => closeDlmmPositionInner(client, params));
}

async function closeDlmmPositionInner(
  client: MeteoraClient,
  params: CloseDlmmPositionParams
): Promise<DlmmZapBundle> {
  const {
    lbPair,
    outputMint,
    bps = 10000,
    route = 'auto',
    swapSlippageBps = 150,
  } = params;
  const user = params.user ?? params.owner;
  if (!user) {
    throw new Error('closeDlmmPosition requires `user` (or `owner`).');
  }

  const dlmm = await getPool(client.connection, lbPair);

  // The pool side we zap FROM is whichever mint is not the requested output.
  const inputMint = dlmm.lbPair.tokenXMint.equals(outputMint)
    ? dlmm.lbPair.tokenYMint
    : dlmm.lbPair.tokenXMint;
  const inputIsX = dlmm.lbPair.tokenXMint.equals(inputMint);

  // Resolve which positions to close.
  const { userPositions } = await dlmm.getPositionsByUserAndLbPair(user);
  const selected = params.position
    ? userPositions.filter((p) => p.publicKey.equals(params.position!))
    : userPositions;
  if (selected.length === 0) {
    throw new Error('No positions found to close for this user/lbPair.');
  }
  // Skip emptied positions (zero liquidity and no pending fees): the DLMM SDK's
  // removeLiquidity crashes on them (`activeBins[0]` is undefined), and there is
  // nothing to withdraw. This mirrors its own with-liquidity-or-fees filter.
  const targets = selected.filter((p) => {
    const d = p.positionData;
    const hasLiquidity = Number(d.totalXAmount) > 0 || Number(d.totalYAmount) > 0;
    const hasFees = !d.feeX.isZero() || !d.feeY.isZero();
    return hasLiquidity || hasFees;
  });
  if (targets.length === 0) {
    throw new Error(
      'No positions with removable liquidity or pending fees to close.'
    );
  }

  // Build the remove-liquidity (claim + close) transactions and total the
  // withdrawn input side. removeLiquidity returns an array because a wide
  // position is split across several transactions (each within the size limit);
  // keep them as separate bundle entries rather than merging into one.
  const setupTxs: Transaction[] = [];
  let amountIn = new BN(0);
  for (const pos of targets) {
    const binIds = pos.positionData.positionBinData.map((b) => b.binId);
    const removeTxs = await dlmm.removeLiquidity({
      position: pos.publicKey,
      user,
      fromBinId: binIds[0],
      toBinId: binIds[binIds.length - 1],
      bps: new BN(bps),
      shouldClaimAndClose: true,
    });
    setupTxs.push(...removeTxs);
    for (const b of pos.positionData.positionBinData) {
      amountIn = amountIn.add(
        new BN(inputIsX ? b.positionXAmount : b.positionYAmount)
      );
    }
  }
  amountIn = amountIn.mul(new BN(bps)).div(new BN(10000));

  const { tokenXProgram, tokenYProgram } = getTokenProgramId(dlmm.lbPair);
  const inputTokenProgram = inputIsX ? tokenXProgram : tokenYProgram;
  const outputTokenProgram = inputIsX ? tokenYProgram : tokenXProgram;

  const { route: chosen, jupiterQuote } = await resolveZapOutRoute(
    client,
    lbPair,
    inputMint,
    outputMint,
    amountIn,
    swapSlippageBps,
    route
  );

  const zap = client.zap();
  let mainTx: Transaction;
  if (chosen === 'jupiter') {
    if (!jupiterQuote) throw new Error('Jupiter route selected but no quote.');
    const swapResponse = await getJupiterSwapInstruction(user, jupiterQuote, {
      jupiterApiUrl: client.jupiterApiUrl,
      jupiterApiKey: client.jupiterApiKey,
    });
    mainTx = await zap.zapOutThroughJupiter({
      user,
      inputMint,
      outputMint,
      inputTokenProgram,
      outputTokenProgram,
      jupiterSwapResponse: swapResponse,
      maxSwapAmount: new BN(jupiterQuote.inAmount),
      percentageToZapOut: 100,
    });
  } else {
    mainTx = await zap.zapOutThroughDlmm({
      user,
      lbPairAddress: lbPair,
      inputMint,
      outputMint,
      inputTokenProgram,
      outputTokenProgram,
      amountIn,
      minimumSwapAmountOut: new BN(0),
      maxSwapAmount: amountIn,
      percentageToZapOut: 100,
    });
  }

  const transactions: BundleTx[] = [
    ...setupTxs.map((transaction) => ({ label: 'setup' as const, transaction })),
    { label: 'main', transaction: mainTx },
  ];
  return { transactions, route: chosen };
}
