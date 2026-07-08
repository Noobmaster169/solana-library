import { PublicKey } from '@solana/web3.js';
import type { FlashClient } from '../client/createFlashClient';
import { PROGRAM_ID, WITHDRAWAL_ESCROW_RECEIPT_SEED } from '../constants';
import { toPublicKey } from '../accounts/helpers/pdaAndDecode';
import { resolveToken } from './resolveToken';

// Track a withdrawal to completion without the SDK. buildWithdraw opens a
// per-(owner, mint) escrow receipt account that the validator CLOSES once it
// settles the payout — so "account gone" means "paid out". These helpers derive
// that receipt PDA and poll its existence (our own `awaitClosed`).

export interface WithdrawalReceiptParams {
  /** Token symbol (e.g. "USDC") or mint address — the withdrawn collateral. */
  token: string | PublicKey;
  /** Basket owner whose withdrawal to track (default: the client's wallet). */
  owner?: string | PublicKey;
  poolName?: string;
}

/**
 * Derive the withdrawal escrow receipt PDA for (owner, mint) — byte-exact with
 * the on-chain program (`['withdrawal_escrow_receipt', owner, mint]`), no SDK.
 */
export function deriveWithdrawalReceiptAddress(
  flash: FlashClient,
  params: WithdrawalReceiptParams
): PublicKey {
  const { mint } = resolveToken(flash, params.token, params.poolName);
  const owner = params.owner ? toPublicKey(params.owner) : flash.wallet;
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(WITHDRAWAL_ESCROW_RECEIPT_SEED), owner.toBuffer(), mint.toBuffer()],
    PROGRAM_ID[flash.cluster]
  );
  return pda;
}

/** True while the escrow receipt is still present on-chain (payout pending). */
async function receiptExists(flash: FlashClient, receipt: PublicKey): Promise<boolean> {
  const info = await flash.connection.getAccountInfo(receipt, 'confirmed').catch(() => null);
  return info !== null;
}

/**
 * Whether the withdrawal has settled: its escrow receipt account no longer
 * exists (the validator closes it once the payout lands). A single on-chain
 * check — call it after the withdrawal request has been submitted.
 */
export async function isWithdrawalSettled(
  flash: FlashClient,
  params: WithdrawalReceiptParams
): Promise<boolean> {
  return !(await receiptExists(flash, deriveWithdrawalReceiptAddress(flash, params)));
}

export type WithdrawalStatus = 'settled' | 'timeout';

export interface AwaitWithdrawalOptions {
  /** Max time to poll before giving up, in ms (default 30_000). */
  timeoutMs?: number;
  /** Delay between polls, in ms (default 1_500). */
  intervalMs?: number;
}

/**
 * Poll the withdrawal escrow receipt until it's closed (payout landed) — a
 * dependency-free equivalent of the SDK's `awaitClosed`. The receipt exists
 * while the payout is pending and is closed once the validator settles it, so an
 * ABSENT account means settled. Call this only AFTER the withdrawal request has
 * been submitted/confirmed (before that, "not created yet" also reads as absent).
 * Returns `'timeout'` if the receipt is still present when the deadline passes.
 */
export async function awaitWithdrawalSettled(
  flash: FlashClient,
  params: WithdrawalReceiptParams,
  opts: AwaitWithdrawalOptions = {}
): Promise<WithdrawalStatus> {
  const receipt = deriveWithdrawalReceiptAddress(flash, params);
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const intervalMs = opts.intervalMs ?? 1_500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await receiptExists(flash, receipt))) return 'settled'; // absent → paid out
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return 'timeout';
}
