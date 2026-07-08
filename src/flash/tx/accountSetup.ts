import { PublicKey } from '@solana/web3.js';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { toPublicKey } from '../accounts/helpers/pdaAndDecode';

// One-time account setup + delegation. A first-time trader initializes the
// Basket, deposit ledger, and trade vault, then delegates the Basket to the ER.
// Funds movement lives in buildDeposit / buildWithdraw. Each returns an UNSIGNED
// InstructionResult — submit with `sendAndConfirmBase`.

/** Create the caller's Basket account. Idempotent-guard on-chain; run once. */
export function buildInitializeBasket(flash: FlashClient): Promise<InstructionResult> {
  return flash.sdk().initializeBasket();
}

/** Create the user deposit ledger (required before the first deposit). */
export function buildInitializeUserDepositLedger(flash: FlashClient): Promise<InstructionResult> {
  return flash.sdk().initializeUserDepositLedger();
}

/** Initialize the pool trade vault for a mint (required once per collateral mint). */
export function buildInitTradeVault(flash: FlashClient, mint: PublicKey): Promise<InstructionResult> {
  return flash.sdk().initTradeVault(mint);
}

/** Delegate the Basket to the ER so positions/orders can be traded. */
export function buildDelegateBasket(
  flash: FlashClient,
  owner?: string | PublicKey
): Promise<InstructionResult> {
  return flash.sdk().delegateBasket(owner ? toPublicKey(owner) : flash.wallet);
}
