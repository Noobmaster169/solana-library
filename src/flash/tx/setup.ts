import { PublicKey } from '@solana/web3.js';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { getTokens } from '../markets';
import { toTokenAmount } from './common';

// ---------------------------------------------------------------------------
// Account setup + the funds lifecycle: initialize → deposit → delegate.
//
// A first-time trader must, on the base layer:
//   1. buildInitializeBasket   — create the per-owner Basket
//   2. buildDeposit            — fund a collateral token (init the trade vault
//                                first if that mint has none)
//   3. buildDelegateBasket     — delegate the Basket to the ER so it can trade
//
// Each returns an UNSIGNED InstructionResult — submit with `sendAndConfirmBase`.
// ---------------------------------------------------------------------------

/** Create the caller's Basket account. Idempotent-guard on-chain; run once. */
export function buildInitializeBasket(flash: FlashClient): Promise<InstructionResult> {
  return flash.sdk().initializeBasket();
}

/** Create the user deposit ledger (required before the first deposit). */
export function buildInitializeUserDepositLedger(
  flash: FlashClient
): Promise<InstructionResult> {
  return flash.sdk().initializeUserDepositLedger();
}

/** Initialize the pool trade vault for a mint (required once per collateral mint). */
export function buildInitTradeVault(
  flash: FlashClient,
  mint: PublicKey
): Promise<InstructionResult> {
  return flash.sdk().initTradeVault(mint);
}

export interface DepositParams {
  /** Token symbol (e.g. "USDC") or mint address. */
  token: string | PublicKey;
  /** Amount in whole tokens. */
  amount: number;
  poolName?: string;
}

/** Deposit collateral into the trade vault. Resolves mint + decimals by symbol. */
export function buildDeposit(
  flash: FlashClient,
  params: DepositParams
): Promise<InstructionResult> {
  const tokens = getTokens(flash.cluster, params.poolName);

  // Prefer a symbol match; otherwise treat the value as a mint address.
  const bySymbol =
    typeof params.token === 'string'
      ? tokens.find((x) => x.symbol.toUpperCase() === params.token.toString().toUpperCase())
      : undefined;
  const token =
    bySymbol ??
    tokens.find((x) =>
      x.mint.equals(typeof params.token === 'string' ? new PublicKey(params.token) : params.token)
    );
  if (!token) throw new Error(`deposit token not found in pool registry: ${params.token}`);

  return flash.sdk().depositDirect(token.mint, toTokenAmount(params.amount, token.decimals));
}

/** Delegate the Basket to the ER so positions/orders can be traded. */
export function buildDelegateBasket(
  flash: FlashClient,
  owner?: string | PublicKey
): Promise<InstructionResult> {
  const ownerPk = owner
    ? typeof owner === 'string'
      ? new PublicKey(owner)
      : owner
    : flash.wallet;
  return flash.sdk().delegateBasket(ownerPk);
}
