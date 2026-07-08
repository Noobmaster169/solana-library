// flash/assets — the full tradable universe grouped by asset class (no wallet).
//   npm run script flash/assets [assetClass]
// Optional filter: Crypto | "US Equity" | Forex | Metals | Commodities
/* eslint-disable no-console */
import { getAvailableMarkets, type AssetClass } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'list every tradable asset across all Flash pools, grouped by class',
  params: [
    { name: '[assetClass]', desc: 'optional filter: Crypto | US Equity | Forex | Metals | Commodities' },
  ],
};

const ORDER: AssetClass[] = ['Crypto', 'US Equity', 'Forex', 'Metals', 'Commodities', 'Other'];

export default async function run(_ctx: Context, args: string[]): Promise<void> {
  const filter = args.join(' ').trim().toLowerCase();
  const markets = getAvailableMarkets(); // all pools, all classes

  // Group by asset class → target symbol → its long/short markets.
  const byClass = new Map<AssetClass, Map<string, typeof markets>>();
  for (const m of markets) {
    if (filter && m.assetClass.toLowerCase() !== filter) continue;
    const cls = byClass.get(m.assetClass) ?? new Map();
    byClass.set(m.assetClass, cls);
    (cls.get(m.targetSymbol) ?? cls.set(m.targetSymbol, []).get(m.targetSymbol)!).push(m);
  }

  const totalAssets = new Set(markets.map((m) => m.targetSymbol)).size;
  console.log(`  ${markets.length} markets · ${totalAssets} assets · ${byClass.size} classes shown`);

  for (const cls of ORDER) {
    const group = byClass.get(cls);
    if (!group) continue;
    console.log(`\n  ── ${cls} (${group.size}) ──`);
    for (const [symbol, ms] of [...group].sort()) {
      const pool = ms[0]!.pool;
      const legs = ms
        .sort((a, b) => a.side.localeCompare(b.side))
        .map((m) => `${m.side} via ${m.collateralSymbol} ${m.maxLeverage}x`)
        .join('  |  ');
      console.log(`    ${symbol.padEnd(9)} ${legs}   (${pool})`);
    }
  }
}
