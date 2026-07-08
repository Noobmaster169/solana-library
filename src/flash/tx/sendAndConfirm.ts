import { Keypair } from '@solana/web3.js';
import type {
  InstructionResult,
  SendErOpts,
  SendErResult,
  SendTransactionOpts,
} from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';

// Submit builder output: trades go to the ER via `sendAndConfirmEr`, setup to
// the base layer via `sendAndConfirmBase`. Both need a keypair — read-only throws.

function requireKeypair(flash: FlashClient): Keypair {
  if (!flash.keypair) {
    throw new Error(
      'this action signs a transaction — create the FlashClient with a keypair'
    );
  }
  return flash.keypair;
}

/** Sign + submit a trade instruction set to the ER, then poll for confirmation. */
export function sendAndConfirmEr(
  flash: FlashClient,
  built: InstructionResult,
  opts?: SendErOpts
): Promise<SendErResult> {
  const owner = requireKeypair(flash);
  const signers = [owner, ...(built.additionalSigners as Keypair[])];
  return flash.sdk().sendAndConfirmErTransaction(built.instructions, signers, opts);
}

/** Sign + submit a base-layer (setup) instruction set with the owner wallet. */
export function sendAndConfirmBase(
  flash: FlashClient,
  built: InstructionResult,
  opts?: SendTransactionOpts
): Promise<string> {
  requireKeypair(flash);
  return flash.sdk().sendAndConfirmTransaction(built.instructions, {
    additionalSigners: built.additionalSigners,
    ...opts,
  });
}
