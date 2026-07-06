// flash/close-position — build + send a close-position tx to the ER (WRITE).
//   npm run script flash/close-position <target> <side> [slippageBps]
// Requires KEYPAIR_PATH and FLASH_ER_RPC; closes the whole position.
/* eslint-disable no-console */
import { buildClosePosition, sendAndConfirmEr } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'close a Flash position (WRITE — real funds on mainnet)',
  params: [
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '[slippageBps]', desc: 'max exit slippage in bps (default 100)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [target, side, slippage] = args;
  if (!target || !side) {
    console.log('  skipped — usage: npm run script flash/close-position <target> <side> [slippageBps]');
    return;
  }

  const flash = ctx.flash(ctx.wallet());
  const built = await buildClosePosition(flash, {
    targetSymbol: target,
    side: side as 'long' | 'short',
    slippageBps: slippage ? Number(slippage) : undefined,
  });
  console.log(`  closing ${target} ${side}; sending ${built.instructions.length} instruction(s) to ER…`);
  const res = await sendAndConfirmEr(flash, built);
  console.log(`  ✓ signature: ${res.signature}`);
}
