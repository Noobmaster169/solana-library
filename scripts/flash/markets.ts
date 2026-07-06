// flash/markets — list Flash Trade V2 markets + token USD prices (no wallet).
//   npm run script flash/markets
/* eslint-disable no-console */
import { getMarkets, getTokenPrices } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'list Flash markets + token USD prices',
};

export default async function run(ctx: Context): Promise<void> {
  const markets = getMarkets();
  console.log(`  markets: ${markets.length}`);
  for (const m of markets.slice(0, 12)) {
    console.log(
      `    ${m.name.padEnd(12)} target=${m.targetSymbol.padEnd(6)} ` +
        `collateral=${m.collateralSymbol.padEnd(6)} maxLev=${m.maxLeverage}x`
    );
  }

  const prices = await getTokenPrices(ctx.jupiter);
  console.log('  token prices:');
  for (const t of prices) {
    const px = t.usdPrice === null ? 'n/a' : `$${t.usdPrice.toLocaleString()}`;
    console.log(`    ${t.symbol.padEnd(8)} ${px}`);
  }
}
