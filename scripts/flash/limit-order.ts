// flash/limit-order — place or cancel a limit (entry) order (WRITE, ER).
//   place:  npm run script flash/limit-order place  <target> <side> <limitPrice> <size> <reserve>
//   cancel: npm run script flash/limit-order cancel <target> <side> <orderId>
// Requires KEYPAIR_PATH + FLASH_ER_RPC.
/* eslint-disable no-console */
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import { buildPlaceLimitOrder, buildCancelLimitOrder, sendAndConfirmEr } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'place or cancel a Flash limit order (WRITE — real funds)',
  params: [
    { name: '<action>', desc: 'place | cancel' },
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '<rest>', desc: 'place: <limitPrice> <size> <reserve> · cancel: <orderId>' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [action, target, side, ...rest] = args;
  if (!action || !target || !side) {
    console.log('  skipped — usage: npm run script flash/limit-order <place|cancel> <target> <side> …');
    return;
  }
  const positionSide = side as 'long' | 'short';
  const flash = ctx.flash(ctx.wallet());

  let built: InstructionResult;
  if (action === 'place') {
    const [limitPrice, size, reserve] = rest;
    if (!limitPrice || !size || !reserve) {
      console.log('  place usage: flash/limit-order place <target> <side> <limitPrice> <size> <reserve>');
      return;
    }
    built = await buildPlaceLimitOrder(flash, {
      targetSymbol: target,
      side: positionSide,
      limitPrice: Number(limitPrice),
      size: Number(size),
      reserveAmount: Number(reserve),
    });
  } else if (action === 'cancel') {
    const [orderId] = rest;
    if (!orderId) {
      console.log('  cancel usage: flash/limit-order cancel <target> <side> <orderId>');
      return;
    }
    built = await buildCancelLimitOrder(flash, {
      targetSymbol: target,
      side: positionSide,
      orderId: Number(orderId),
    });
  } else {
    console.log(`  unknown action "${action}" — use "place" or "cancel"`);
    return;
  }

  console.log(`  ${action} limit order on ${target} ${side}; sending ${built.instructions.length} instruction(s) to ER…`);
  const res = await sendAndConfirmEr(flash, built);
  console.log(`  ✓ signature: ${res.signature}`);
}
