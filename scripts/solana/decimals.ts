// solana/decimals — batched mint-decimals read.
//   npm run script solana/decimals [mint...]   (defaults: USDC + wrapped SOL)
/* eslint-disable no-console */
import { getDecimals, WRAPPED_SOL_MINT } from '@solana';
import type { Context } from '../lib/context';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const meta = {
  summary: 'read token decimals for one or more mints',
  params: [
    { name: '[mint...]', desc: 'mint addresses to look up (default: USDC + wrapped SOL)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const mints = args.length ? args : [USDC, WRAPPED_SOL_MINT];
  const decimals = await getDecimals(ctx.connection, mints);
  mints.forEach((mint, i) => console.log(`  ${mint}: ${decimals[i]} decimals`));
}
