// meteora/positions — a wallet's DLMM positions, with optional USD valuation.
//   npm run script meteora/positions <owner>
/* eslint-disable no-console */
import { getDlmmPositionsByOwner, attachUsdValues } from '@meteora';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'list a wallet’s DLMM positions + USD total',
  params: [
    { name: '<owner>', desc: 'required — wallet address to list DLMM positions for' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const owner = args[0];
  if (!owner) {
    console.log('  skipped — pass an owner address: npm run script meteora/positions <owner>');
    return;
  }

  console.log(`  owner: ${owner}`);
  const positions = await getDlmmPositionsByOwner(ctx.connection, owner);
  console.log(`  positions found: ${positions.length}`);

  for (const p of positions.slice(0, 8)) {
    console.log(
      `    ${p.position.toBase58().slice(0, 8)} [${p.version}] ` +
        `pool=${p.lbPair.toBase58().slice(0, 8)} ` +
        `X=${p.totalXAmount.toString()} Y=${p.totalYAmount.toString()} ` +
        `feeX=${p.feeX.toString()} feeY=${p.feeY.toString()} ` +
        `${p.outOfRange ? '(out of range)' : ''}`
    );
  }

  if (positions.length > 0) {
    const valued = await attachUsdValues(ctx.jupiter, positions);
    const total = valued.reduce((s, p) => s + p.totalValue, 0);
    console.log(`  total portfolio value: $${total.toFixed(2)}`);
  }
}
