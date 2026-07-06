// jupiter/price — USD prices for one or more tokens, aligned to input order.
//   npm run script jupiter/price [symbolOrMint...]   (defaults: SOL USDC JUP)
/* eslint-disable no-console */
import { getPrices } from '@jupiter';
import type { Context } from '../lib/context';

// Convenience symbols so you can type `jupiter/price SOL USDC` instead of mints.
const SYMBOLS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

export const meta = {
  summary: 'fetch USD prices for tokens (symbols or mints)',
  params: [
    {
      name: '[token...]',
      desc: 'symbols (SOL/USDC/JUP) or mint addresses (default: SOL USDC JUP)',
    },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const inputs = args.length ? args : ['SOL', 'USDC', 'JUP'];
  const mints = inputs.map((t) => SYMBOLS[t.toUpperCase()] ?? t);

  console.log(`  host: ${ctx.jupiter.baseUrl}`);
  const prices = await getPrices(ctx.jupiter, mints);
  inputs.forEach((label, i) =>
    console.log(`  ${label}: $${prices[i]?.usdPrice ?? '—'}`)
  );
}
