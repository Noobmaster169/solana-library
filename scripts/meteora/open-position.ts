// meteora/open-position — build + simulate a DLMM zap-in bundle (no send).
//   npm run script meteora/open-position <lbPair> <inputMint> <amount> <user>
/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { openDlmmPosition } from '@meteora';
import { simulateBundle } from '../lib/simulate';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'build + simulate a DLMM open-position (zap-in) bundle',
  params: [
    { name: '<lbPair>', desc: 'required — DLMM pool address' },
    { name: '<inputMint>', desc: 'required — single input token mint' },
    { name: '<amount>', desc: 'required — input amount in base units' },
    { name: '<user>', desc: 'required — wallet that would own the position' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [lbPair, inputMint, amount, user] = args;
  if (!lbPair || !inputMint || !amount || !user) {
    console.log(
      '  skipped — usage: npm run script meteora/open-position <lbPair> <inputMint> <amount> <user>'
    );
    return;
  }
  const client = ctx.meteora();
  const bundle = await openDlmmPosition(client, {
    lbPair: new PublicKey(lbPair),
    inputMint: new PublicKey(inputMint),
    amount: new BN(amount),
    user: new PublicKey(user),
    minDeltaId: -34,
    maxDeltaId: 34,
  });
  await simulateBundle(client.connection, bundle, new PublicKey(user));
}
