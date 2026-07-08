// flash/withdraw — pull idle collateral back out of the protocol (WRITE, base).
//   npm run script flash/withdraw <token> <amount>
//
// Reverses a deposit. `withdrawal_with_action` is the base-layer entry: it opens
// an escrow and queues a validator-driven flow that moves the funds on the ER
// AND settles them back to the owner. After submitting we poll the escrow
// receipt with `awaitWithdrawalSettled` until the validator closes it (payout landed).
//
// The escrow rent is paid by a SEPARATE fee-payer that MUST differ from the
// basket owner — the delegation program rejects `owner == fee_payer`. Point
// FLASH_FEE_PAYER_PATH at a second funded keypair. Requires KEYPAIR_PATH.
/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { Keypair, type Signer } from '@solana/web3.js';
import bs58 from 'bs58';
import { getSupportedTokens, buildWithdraw, awaitWithdrawalSettled, sendAndConfirmBase } from '@flash';
import type { Context } from '../lib/context';

export const meta = {
  summary: 'withdraw idle collateral out of a Flash basket (WRITE — real funds)',
  params: [
    { name: '<token>', desc: 'collateral token symbol to withdraw, e.g. SOL or USDC' },
    { name: '<amount>', desc: 'amount to withdraw in whole tokens' },
  ],
};

/** Expand a leading `~`, then absolutize. */
function expandHome(p: string): string {
  return resolve(p.startsWith('~') ? p.replace(/^~/, homedir()) : p);
}

/** Load the escrow-rent fee-payer from FLASH_FEE_PAYER_PATH (json array or base58). */
function loadFeePayer(): Keypair {
  const path = process.env['FLASH_FEE_PAYER_PATH']?.trim();
  if (!path) {
    throw new Error(
      'FLASH_FEE_PAYER_PATH is not set. A withdrawal needs a fee-payer keypair ' +
        'that differs from the basket owner (it pays the escrow rent and co-signs). ' +
        'Point it at a second funded Solana keypair file in your .env.'
    );
  }
  const contents = readFileSync(expandHome(path), 'utf8').trim();
  const bytes = contents.startsWith('[')
    ? Uint8Array.from(JSON.parse(contents) as number[])
    : bs58.decode(contents);
  return Keypair.fromSecretKey(bytes);
}

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const [token, amountArg] = args;
  if (!token || amountArg === undefined) {
    console.log('  skipped — usage: npm run script flash/withdraw <token> <amount>');
    return;
  }
  const amount = Number(amountArg);
  if (!(amount > 0)) {
    console.log('  skipped — amount must be a positive number of whole tokens');
    return;
  }

  const flash = ctx.flash(ctx.wallet());
  console.log(`  wallet: ${flash.wallet.toBase58()}`);

  const tokenInfo = getSupportedTokens(flash.cluster).find(
    (t) => t.symbol.toUpperCase() === token.toUpperCase()
  );
  if (!tokenInfo) {
    console.log(`  unknown token "${token}" — see: npm run script flash/markets`);
    return;
  }

  const feePayer = loadFeePayer();
  if (feePayer.publicKey.equals(flash.wallet)) {
    console.log('  fee-payer must differ from the basket owner — use a second keypair');
    return;
  }
  console.log(`  fee-payer: ${feePayer.publicKey.toBase58()}`);

  // Leg 1 — base-layer entry. The fee-payer co-signs (pays escrow rent).
  const built = await buildWithdraw(flash, {
    token,
    amount,
    feePayer: feePayer.publicKey,
  });
  console.log(`  → withdraw ${amount} ${tokenInfo.symbol}: submitting request …`);
  const sig1 = await sendAndConfirmBase(flash, built, {
    additionalSigners: [...(built.additionalSigners as Signer[]), feePayer],
  });
  console.log(`    ✓ ${sig1}`);

  // Wait for the validator to close the escrow receipt — our own awaitClosed.
  console.log('  waiting for the validator to settle the payout …');
  const status = await awaitWithdrawalSettled(flash, { token });
  console.log(
    status === 'settled'
      ? `  ✓ settled — the ${amount} ${tokenInfo.symbol} payout has landed.`
      : `  … still pending after the timeout; the validator settles asynchronously ` +
          `(re-check later with isWithdrawalSettled).`
  );
}
