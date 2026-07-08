// flash/adjust-size — increase or decrease an open position's size (WRITE, ER).
//   npm run script flash/adjust-size <target> <side> <increase|decrease> <sizeDelta> [collateral] [slippageBps]
// Increase adds size (+ collateral); decrease removes size. Requires KEYPAIR_PATH + FLASH_ER_RPC.
/* eslint-disable no-console */
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import { buildIncreaseSize, buildDecreaseSize, sendAndConfirmEr } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'increase or decrease a Flash position’s size (WRITE — real funds)',
  params: [
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '<action>', desc: 'increase | decrease' },
    { name: '<sizeDelta>', desc: 'size to add/remove, in target-asset tokens' },
    { name: '[collateral]', desc: 'increase only — collateral to add, in funding tokens (default 0)' },
    { name: '[slippageBps]', desc: 'max slippage in bps (default 100)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [target, side, action, sizeDeltaArg, collateralArg, slippageArg] = args;
  if (!target || !side || !action || !sizeDeltaArg) {
    console.log(
      '  skipped — usage: npm run script flash/adjust-size <target> <side> <increase|decrease> <sizeDelta> [collateral] [slippageBps]'
    );
    return;
  }
  const positionSide = side as 'long' | 'short';
  const sizeDelta = Number(sizeDeltaArg);
  const slippageBps = slippageArg ? Number(slippageArg) : undefined;

  const flash = ctx.flash(ctx.wallet());
  let built: InstructionResult;
  if (action === 'increase') {
    built = await buildIncreaseSize(flash, {
      targetSymbol: target,
      side: positionSide,
      sizeDelta,
      collateralAmount: Number(collateralArg ?? '0'),
      slippageBps,
    });
  } else if (action === 'decrease') {
    built = await buildDecreaseSize(flash, {
      targetSymbol: target,
      side: positionSide,
      sizeDelta,
      slippageBps,
    });
  } else {
    console.log(`  unknown action "${action}" — use "increase" or "decrease"`);
    return;
  }

  console.log(`  ${action} ${target} ${side} by ${sizeDelta}; sending ${built.instructions.length} instruction(s) to ER…`);
  const res = await sendAndConfirmEr(flash, built);
  console.log(`  ✓ signature: ${res.signature}`);
}
