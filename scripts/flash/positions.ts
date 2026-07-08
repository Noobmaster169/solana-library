// flash/positions — a wallet's open Flash positions (no wallet needed to read).
//   npm run script flash/positions <owner>
/* eslint-disable no-console */
import { getUserPositions } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'list a wallet’s open Flash positions',
  params: [
    { name: '<owner>', desc: 'required — wallet address to list Flash positions for' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const owner = args[0];
  if (!owner) {
    console.log('  skipped — pass an owner address: npm run script flash/positions <owner>');
    return;
  }

  console.log(`  owner: ${owner}`);
  const positions = await getUserPositions(ctx.flash(), owner);
  console.log(`  open positions: ${positions.length}`);

  for (const p of positions) {
    console.log(
      `    ${p.marketName.padEnd(12)} size=$${p.sizeUsd.toFixed(2)} ` +
        `(${p.sizeAmount.toFixed(4)} ${p.targetSymbol}) ` +
        `collateral=$${p.collateralUsd.toFixed(2)} ` +
        `lev=${p.leverage.toFixed(2)}x entry=$${p.entryPrice.toFixed(2)}`
    );
  }
}
