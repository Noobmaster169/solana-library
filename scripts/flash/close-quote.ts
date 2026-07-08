// flash/close-quote — quote closing (all or part of) a position. Needs an open
// position; the simulation reverts otherwise. No wallet needed to read.
//   npm run script flash/close-quote <owner> <target> <side> <sizeUsd>
/* eslint-disable no-console */
import { getClosePositionQuote } from '@flash';
import type { Context } from '../lib/context';
import { dumpViewResult } from '../lib/format';

export const meta = {
  summary: 'quote closing a Flash position (needs an open position)',
  params: [
    { name: '<owner>', desc: 'wallet address that holds the position' },
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '<sizeUsd>', desc: 'USD size to close (use the position’s full sizeUsd to close all)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [owner, target, side, sizeUsdArg] = args;
  if (!owner || !target || !side || sizeUsdArg === undefined) {
    console.log('  skipped — usage: npm run script flash/close-quote <owner> <target> <side> <sizeUsd>');
    return;
  }

  console.log(`  quote: close $${sizeUsdArg} of ${target} ${side} for ${owner}`);
  const q = await getClosePositionQuote(ctx.flash(), owner, {
    targetSymbol: target,
    side: side as 'long' | 'short',
    sizeDeltaUsd: Number(sizeUsdArg),
  });
  dumpViewResult('close quote', q as Record<string, unknown>);
}
