// meteora/active-bin — decode a DLMM pool and its active bin + price.
//   npm run script meteora/active-bin [lbPair]   (falls back to a default pool)
/* eslint-disable no-console */
import { getLbPair, getActiveBin } from '@meteora';
import type { Context } from '../lib/context';

// A long-lived mainnet DLMM pool (used in the Meteora SDK's mainnet tests).
const DEFAULT_LBPAIR = '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6';

export const meta = {
  summary: 'decode a DLMM pool + active bin/price',
  params: [
    { name: '[lbPair]', desc: 'DLMM pool (LbPair) address (default: a SOL/USDC pool)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const lbPair = args[0] ?? DEFAULT_LBPAIR;
  console.log(`  pool: ${lbPair}`);

  const pool = await getLbPair(ctx.connection, lbPair);
  if (!pool) throw new Error('pool not found / failed to decode');
  console.log(`  tokenX: ${pool.tokenXMint.toBase58()}`);
  console.log(`  tokenY: ${pool.tokenYMint.toBase58()}`);
  console.log(`  binStep: ${pool.binStep}  activeId: ${pool.activeId}  status: ${pool.status}`);

  const active = await getActiveBin(ctx.connection, lbPair);
  if (!active) throw new Error('active bin did not resolve');
  console.log(`  activeBin: ${active.binId}  pricePerToken: ${active.pricePerToken}`);
}
