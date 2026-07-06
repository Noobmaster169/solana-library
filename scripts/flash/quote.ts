// flash/quote — quote opening a position (fees, entry, liquidation). No wallet.
//   npm run script flash/quote [target] [side] [amountIn] [leverage]
/* eslint-disable no-console */
import { getOpenPositionQuote } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'quote opening a Flash position',
  params: [
    { name: '[target]', desc: 'target symbol (default SOL)' },
    { name: '[side]', desc: 'long | short (default long)' },
    { name: '[amountIn]', desc: 'collateral amount in tokens (default 1)' },
    { name: '[leverage]', desc: 'leverage multiple (default 2)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const targetSymbol = args[0] ?? 'SOL';
  const side = (args[1] ?? 'long') as 'long' | 'short';
  const amountIn = Number(args[2] ?? '1');
  const leverage = Number(args[3] ?? '2');

  console.log(`  quote: ${amountIn} ${targetSymbol} collateral @ ${leverage}x ${side}`);
  const q = await getOpenPositionQuote(ctx.flash(), { targetSymbol, side, amountIn, leverage });

  console.log(`    entry price:       $${q.entryPrice.toFixed(2)}`);
  console.log(`    liquidation price: $${q.liquidationPrice.toFixed(2)}`);
  console.log(`    size:              $${q.sizeUsd.toFixed(2)} (${q.sizeAmount.toFixed(4)} ${targetSymbol})`);
  console.log(`    collateral:        $${q.collateralUsd.toFixed(2)}`);
  console.log(`    effective leverage: ${q.leverage.toFixed(2)}x`);
  console.log(`    open fee:          $${q.totalFeeUsd.toFixed(4)}`);
  console.log(`    available liquidity: $${q.availableLiquidityUsd.toLocaleString()}`);
  console.log(`    swap required:     ${q.swapRequired}`);
}
