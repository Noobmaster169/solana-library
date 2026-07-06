// jupiter/trending — trending tokens over an interval.
//   npm run script jupiter/trending [interval]   (default: 24h)
/* eslint-disable no-console */
import { getTrendingTokens } from '@jupiter';
import type { Context } from '../lib/context';
import type { TrendingInterval } from '@jupiter';

export const meta = {
  summary: 'list top trending tokens',
  params: [
    { name: '[interval]', desc: 'one of 5m | 1h | 6h | 24h (default: 24h)' },
  ],
};

const INTERVALS: TrendingInterval[] = ['5m', '1h', '6h', '24h'];

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const interval = (args[0] ?? '24h') as TrendingInterval;
  if (!INTERVALS.includes(interval)) {
    throw new Error(`invalid interval "${interval}" — use one of ${INTERVALS.join(', ')}`);
  }
  const trending = await getTrendingTokens(ctx.jupiter, 'toptrending', interval);
  console.log(`  top trending (${interval}):`);
  for (const t of trending.slice(0, 10)) {
    console.log(`    ${t.symbol?.padEnd(12) ?? ''} ${t.id}`);
  }
}
