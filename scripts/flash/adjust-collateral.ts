// flash/adjust-collateral — add or remove collateral on an open position (WRITE, ER).
//   npm run script flash/adjust-collateral <target> <side> <add|remove> <amount>
// Add takes funding tokens (lowers leverage); remove takes USD (raises leverage).
// Requires KEYPAIR_PATH + FLASH_ER_RPC.
/* eslint-disable no-console */
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import { buildAddCollateral, buildRemoveCollateral, sendAndConfirmEr } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'add or remove collateral on a Flash position (WRITE — real funds)',
  params: [
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '<action>', desc: 'add | remove' },
    { name: '<amount>', desc: 'add: funding tokens to add · remove: USD to remove' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [target, side, action, amountArg] = args;
  if (!target || !side || !action || amountArg === undefined) {
    console.log('  skipped — usage: npm run script flash/adjust-collateral <target> <side> <add|remove> <amount>');
    return;
  }
  const positionSide = side as 'long' | 'short';
  const amount = Number(amountArg);

  const flash = ctx.flash(ctx.wallet());
  let built: InstructionResult;
  if (action === 'add') {
    built = await buildAddCollateral(flash, { targetSymbol: target, side: positionSide, amount });
  } else if (action === 'remove') {
    built = await buildRemoveCollateral(flash, { targetSymbol: target, side: positionSide, amountUsd: amount });
  } else {
    console.log(`  unknown action "${action}" — use "add" or "remove"`);
    return;
  }

  console.log(`  ${action} collateral on ${target} ${side} (${amount}); sending ${built.instructions.length} instruction(s) to ER…`);
  const res = await sendAndConfirmEr(flash, built);
  console.log(`  ✓ signature: ${res.signature}`);
}
