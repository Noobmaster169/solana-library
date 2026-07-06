// solana/balances — specific-mint token balances for a wallet, one batched read.
//   npm run script solana/balances [owner] [mint...]
/* eslint-disable no-console */
import { getTokenBalances, WRAPPED_SOL_MINT } from '@solana';
import type { Context } from '../lib/context';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
// A large, long-lived account (Circle USDC), used only as a default read target.
const DEFAULT_OWNER = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';

export const meta = {
  summary: 'read a wallet’s balances for specific mints',
  params: [
    { name: '[owner]', desc: 'wallet address to read (default: a Circle USDC account)' },
    { name: '[mint...]', desc: 'mints to check (default: USDC + wrapped SOL)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [owner = DEFAULT_OWNER, ...mints] = args;
  const targets = mints.length ? mints : [USDC, WRAPPED_SOL_MINT];

  const balances = await getTokenBalances(ctx.connection, owner, targets);
  console.log(`  owner: ${owner}`);
  console.log(`  balances found: ${balances.size}`);
  for (const [mint, bal] of balances) {
    console.log(`    ${mint}: amount=${bal.amount.toString()} ata=${bal.address}`);
  }
}
