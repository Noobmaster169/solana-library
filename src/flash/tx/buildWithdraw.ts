import { PublicKey } from '@solana/web3.js';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana';
import type { FlashClient } from '../client/createFlashClient';
import { toTokenAmount } from './tradeResolution';
import { resolveToken } from './resolveToken';

// Withdraw idle collateral back out (base layer) — the reverse of buildDeposit.
// Opens an escrow that a validator settles; track completion with
// `awaitWithdrawalSettled` (or a one-shot `isWithdrawalSettled`).

export interface WithdrawParams {
  /** Token symbol (e.g. "USDC") or mint address. */
  token: string | PublicKey;
  /** Amount to withdraw, in whole tokens. */
  amount: number;
  /** Fee payer; required and must differ from the wallet. */
  feePayer: PublicKey;
  ownerTokenAccount?: PublicKey;
  token22?: boolean;
  poolName?: string;
}

/** Build an UNSIGNED withdraw instruction set. Submit with `sendAndConfirmBase`. */
export function buildWithdraw(flash: FlashClient, params: WithdrawParams): Promise<InstructionResult> {
  const token = resolveToken(flash, params.token, params.poolName);
  const tokenProgramId = params.token22 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const ownerTokenAccount =
    params.ownerTokenAccount ?? getAssociatedTokenAddress(flash.wallet, token.mint, tokenProgramId);

  return flash.sdk().withdrawalWithAction(
    token.mint,
    ownerTokenAccount,
    toTokenAmount(params.amount, token.decimals),
    params.feePayer,
    params.token22 ?? false
  );
}
