// flash/trigger-order — place or cancel a trigger order (take-profit / stop-loss) (WRITE, ER).
//   place:  npm run script flash/trigger-order place  <target> <side> <triggerPrice> <size> <stopLoss:true|false>
//   cancel: npm run script flash/trigger-order cancel <target> <side> <orderId> <stopLoss:true|false>
// Requires KEYPAIR_PATH + FLASH_ER_RPC.
/* eslint-disable no-console */
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import { buildPlaceTriggerOrder, buildCancelTriggerOrder, sendAndConfirmEr } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'place or cancel a Flash trigger order — TP/SL (WRITE — real funds)',
  params: [
    { name: '<action>', desc: 'place | cancel' },
    { name: '<target>', desc: 'target symbol, e.g. SOL' },
    { name: '<side>', desc: 'long | short' },
    { name: '<rest>', desc: 'place: <triggerPrice> <size> <stopLoss> · cancel: <orderId> <stopLoss>' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [action, target, side, ...rest] = args;
  if (!action || !target || !side) {
    console.log('  skipped — usage: npm run script flash/trigger-order <place|cancel> <target> <side> …');
    return;
  }
  const positionSide = side as 'long' | 'short';
  const flash = ctx.flash(ctx.wallet());

  let built: InstructionResult;
  if (action === 'place') {
    const [triggerPrice, size, stopLoss] = rest;
    if (!triggerPrice || !size || stopLoss === undefined) {
      console.log('  place usage: flash/trigger-order place <target> <side> <triggerPrice> <size> <stopLoss:true|false>');
      return;
    }
    built = await buildPlaceTriggerOrder(flash, {
      targetSymbol: target,
      side: positionSide,
      triggerPrice: Number(triggerPrice),
      size: Number(size),
      isStopLoss: stopLoss === 'true',
    });
  } else if (action === 'cancel') {
    const [orderId, stopLoss] = rest;
    if (!orderId || stopLoss === undefined) {
      console.log('  cancel usage: flash/trigger-order cancel <target> <side> <orderId> <stopLoss:true|false>');
      return;
    }
    built = await buildCancelTriggerOrder(flash, {
      targetSymbol: target,
      side: positionSide,
      orderId: Number(orderId),
      isStopLoss: stopLoss === 'true',
    });
  } else {
    console.log(`  unknown action "${action}" — use "place" or "cancel"`);
    return;
  }

  console.log(`  ${action} trigger order on ${target} ${side}; sending ${built.instructions.length} instruction(s) to ER…`);
  const res = await sendAndConfirmEr(flash, built);
  console.log(`  ✓ signature: ${res.signature}`);
}
