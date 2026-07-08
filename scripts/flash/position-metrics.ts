// flash/position-metrics — live PnL, liquidation price, and full position data
// for one open position (no wallet needed to read).
//   npm run script flash/position-metrics <owner> <target> <side>
/* eslint-disable no-console */
import { getUserPnl, getUserLiquidationPrice, getUserPositionData } from '@flash';
import type { Context } from '../lib/context';
import { dumpViewResult } from '../lib/format';

export const meta = {
  summary: 'read a position’s live PnL, liquidation price, and full data',
  params: [
    { name: '<owner>', desc: 'wallet address that holds the position' },
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [owner, target, side] = args;
  if (!owner || !target || !side) {
    console.log('  skipped — usage: npm run script flash/position-metrics <owner> <target> <side>');
    return;
  }
  const flash = ctx.flash();
  const ref = { targetSymbol: target, side: side as 'long' | 'short' };

  console.log(`  owner: ${owner}  ·  ${target} ${side}`);
  const liq = await getUserLiquidationPrice(flash, owner, ref);
  console.log(`  liquidation price: $${liq.toFixed(2)}`);

  dumpViewResult('pnl', (await getUserPnl(flash, owner, ref)) as Record<string, unknown>);
  dumpViewResult('position data', (await getUserPositionData(flash, owner, ref)) as Record<string, unknown>);
}
