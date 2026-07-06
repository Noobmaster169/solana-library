// flash/setup — one-time account setup + funds lifecycle (WRITE, base layer).
//   npm run script flash/setup <token> <amount>
//
// Runs the deposit → delegate lifecycle a first-time trader needs, in order:
//   initialize basket → initialize deposit ledger → initialize trade vault →
//   deposit collateral → delegate basket to the ER.
//
// Every step is idempotent: the SDK builders return no instructions when the
// account already exists, so re-running only does what's left (e.g. deposit more
// and skip the inits). Requires KEYPAIR_PATH.
/* eslint-disable no-console */
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import {
  getTokens,
  buildInitializeBasket,
  buildInitializeUserDepositLedger,
  buildInitTradeVault,
  buildDeposit,
  buildDelegateBasket,
  sendAndConfirmBase,
  type FlashClient,
} from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'initialize + fund + delegate a Flash basket (WRITE — real funds)',
  params: [
    { name: '<token>', desc: 'collateral token symbol to deposit, e.g. SOL or USDC' },
    { name: '<amount>', desc: 'amount to deposit in whole tokens (0 to skip the deposit)' },
  ],
};

/** Send a step's instructions if it has any; report whether it ran or was already done. */
async function runStep(
  flash: FlashClient,
  label: string,
  built: InstructionResult
): Promise<void> {
  if (built.instructions.length === 0) {
    console.log(`  · ${label} — already done, skipping`);
    return;
  }
  console.log(`  → ${label} …`);
  const sig = await sendAndConfirmBase(flash, built);
  console.log(`    ✓ ${sig}`);
}

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [token, amountArg] = args;
  if (!token || amountArg === undefined) {
    console.log('  skipped — usage: npm run script flash/setup <token> <amount>');
    return;
  }
  const amount = Number(amountArg);

  const flash = ctx.flash(ctx.wallet());
  console.log(`  wallet: ${flash.wallet.toBase58()}`);

  const tokenInfo = getTokens(flash.cluster).find(
    (t) => t.symbol.toUpperCase() === token.toUpperCase()
  );
  if (!tokenInfo) {
    console.log(`  unknown token "${token}" — see: npm run script flash/markets`);
    return;
  }

  // Base-layer setup + deposit, each idempotent and sent as its own tx.
  await runStep(flash, 'initialize basket', await buildInitializeBasket(flash));
  await runStep(flash, 'initialize deposit ledger', await buildInitializeUserDepositLedger(flash));
  await runStep(flash, `initialize ${tokenInfo.symbol} trade vault`, await buildInitTradeVault(flash, tokenInfo.mint));
  if (amount > 0) {
    await runStep(flash, `deposit ${amount} ${tokenInfo.symbol}`, await buildDeposit(flash, { token, amount }));
  }

  // Delegate the basket to the ER so it can trade.
  await runStep(flash, 'delegate basket to ER', await buildDelegateBasket(flash));

  console.log('  setup complete — you can now open positions on the ER.');
}
