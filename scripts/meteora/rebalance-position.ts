// meteora/rebalance-position — build + simulate a DLMM rebalance bundle.
//   npm run script meteora/rebalance-position <lbPair> <position> <user>
/* eslint-disable no-console */
import { PublicKey } from '@solana/web3.js';
import { rebalanceDlmmPosition } from '@meteora';
import { simulateBundle } from '../lib/simulate';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'build + simulate a DLMM rebalance-position bundle',
  params: [
    { name: '<lbPair>', desc: 'required — DLMM pool address' },
    { name: '<position>', desc: 'required — existing position address' },
    { name: '<user>', desc: 'required — wallet holding the position' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [lbPair, position, user] = args;
  if (!lbPair || !position || !user) {
    console.log(
      '  skipped — usage: npm run script meteora/rebalance-position <lbPair> <position> <user>'
    );
    return;
  }
  const client = ctx.meteora();
  const bundle = await rebalanceDlmmPosition(client, {
    lbPair: new PublicKey(lbPair),
    position: new PublicKey(position),
    user: new PublicKey(user),
    minDeltaId: -34,
    maxDeltaId: 34,
  });
  await simulateBundle(client.connection, bundle, new PublicKey(user));
}
