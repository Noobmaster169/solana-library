// meteora/close-position — build + simulate a DLMM close (remove + zap-out).
//   npm run script meteora/close-position <lbPair> <outputMint> <owner>
/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import { closeDlmmPosition } from '@meteora';
import { simulateBundle } from '../lib/simulate';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'build + simulate a DLMM close-position (remove + zap-out) bundle',
  params: [
    { name: '<lbPair>', desc: 'required — DLMM pool address' },
    { name: '<outputMint>', desc: 'required — token to receive' },
    { name: '<owner>', desc: 'required — wallet holding the position(s)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [lbPair, outputMint, owner] = args;
  if (!lbPair || !outputMint || !owner) {
    console.log(
      '  skipped — usage: npm run script meteora/close-position <lbPair> <outputMint> <owner>'
    );
    return;
  }
  const client = ctx.meteora();
  const bundle = await closeDlmmPosition(client, {
    lbPair: new PublicKey(lbPair),
    outputMint: new PublicKey(outputMint),
    owner: new PublicKey(owner),
  });
  await simulateBundle(client.connection, bundle, new PublicKey(owner));
}
