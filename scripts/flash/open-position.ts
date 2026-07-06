// flash/open-position — build + send an open-position tx to the ER (WRITE).
//   npm run script flash/open-position <target> <side> <collateral> <leverage> [slippageBps]
// Requires KEYPAIR_PATH (a funded, ER-delegated basket) and FLASH_ER_RPC.
/* eslint-disable no-console */
import { buildOpenPosition, sendAndConfirmEr, getOpenPositionQuote } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'open a Flash position (WRITE — real funds on mainnet)',
  params: [
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '<collateral>', desc: 'collateral amount in funding tokens' },
    { name: '<leverage>', desc: 'leverage multiple, e.g. 2' },
    { name: '[slippageBps]', desc: 'max entry slippage in bps (default 100)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [target, side, collateral, leverage, slippage] = args;
  if (!target || !side || !collateral || !leverage) {
    console.log(
      '  skipped — usage: npm run script flash/open-position <target> <side> <collateral> <leverage> [slippageBps]'
    );
    return;
  }

  const targetSymbol = target;
  const positionSide = side as 'long' | 'short';
  const collateralAmount = Number(collateral);
  const slippageBps = slippage ? Number(slippage) : undefined;

  // Preview via a quote before committing funds.
  const q = await getOpenPositionQuote(ctx.flash(), {
    targetSymbol,
    side: positionSide,
    amountIn: collateralAmount,
    leverage: Number(leverage),
  });
  console.log(
    `  opening ~$${q.sizeUsd.toFixed(2)} ${target} ${side} @ ${q.leverage.toFixed(2)}x ` +
      `(entry $${q.entryPrice.toFixed(2)}, liq $${q.liquidationPrice.toFixed(2)}, fee $${q.totalFeeUsd.toFixed(4)})`
  );

  const flash = ctx.flash(ctx.wallet());
  const built = await buildOpenPosition(flash, {
    targetSymbol,
    side: positionSide,
    collateralAmount,
    leverage: Number(leverage),
    slippageBps,
  });
  console.log(`  built ${built.instructions.length} instruction(s); sending to ER…`);
  const res = await sendAndConfirmEr(flash, built);
  console.log(`  ✓ signature: ${res.signature}`);
}
