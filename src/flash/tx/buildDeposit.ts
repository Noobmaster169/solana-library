import { PublicKey } from '@solana/web3.js';
import type { InstructionResult } from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { toTokenAmount } from './tradeResolution';
import { resolveToken } from './resolveToken';

// Deposit collateral into the trade vault (base layer) — the reverse of
// buildWithdraw. Resolves the mint + decimals from the token symbol.

export interface DepositParams {
  /** Token symbol (e.g. "USDC") or mint address. */
  token: string | PublicKey;
  /** Amount in whole tokens. */
  amount: number;
  poolName?: string;
}

/** Build an UNSIGNED deposit instruction set. Submit with `sendAndConfirmBase`. */
export function buildDeposit(flash: FlashClient, params: DepositParams): Promise<InstructionResult> {
  const token = resolveToken(flash, params.token, params.poolName);
  return flash.sdk().depositDirect(token.mint, toTokenAmount(params.amount, token.decimals));
}
