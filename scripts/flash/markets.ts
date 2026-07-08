// flash/markets — list Flash Trade V2 markets + token USD prices (no wallet).
//   npm run script flash/markets
/* eslint-disable no-console */
import { getAvailableMarkets, getSupportedTokenPrices } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'list Flash markets + token USD prices',
};

export default async function run(ctx: Context): Promise<void> {
  const markets = getAvailableMarkets();
  console.log(`  markets: ${markets.length}`);
  for (const m of markets) {
    console.log(
      `    ${m.name.padEnd(12)} target=${m.targetSymbol.padEnd(6)} ` +
        `collateral=${m.collateralSymbol.padEnd(6)} maxLev=${m.maxLeverage}x`
    );
  }

  const prices = await getSupportedTokenPrices(ctx.jupiter);
  console.log('  token prices:');
  for (const t of prices) {
    const px = t.usdPrice === null ? 'n/a' : `$${t.usdPrice.toLocaleString()}`;
    console.log(`    ${t.symbol.padEnd(8)} ${px}`);
  }
}
