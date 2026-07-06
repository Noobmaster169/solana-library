import { PublicKey } from '@solana/web3.js';
import { Address, toPublicKey } from '../parse/types';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from './constants';

/**
 * Derive the associated token account address for `(owner, mint, tokenProgram)`.
 *
 * The token program is part of the ATA seed, so a mint on Token-2022 derives a
 * different ATA than the same owner/mint on the legacy program — pass the
 * matching `tokenProgramId`.
 */
export function getAssociatedTokenAddress(
  owner: Address,
  mint: Address,
  tokenProgramId: Address = TOKEN_PROGRAM_ID
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      toPublicKey(owner).toBuffer(),
      toPublicKey(tokenProgramId).toBuffer(),
      toPublicKey(mint).toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}
