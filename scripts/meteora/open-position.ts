// meteora/open-position — WRITE script template (not yet implemented).
//
// This is the placeholder the "test opening a position" goal points at. It
// shows the intended shape of a write script — load the signing wallet, build
// the instruction, sign, send, confirm — but the Meteora DLMM `tx/` layer that
// builds the add-liquidity instruction is a follow-up (see src/meteora/dlmm/tx).
//
//   npm run script meteora/open-position [lbPair]
/* eslint-disable no-console */
import type { Context } from '../lib/context';

const DEFAULT_LBPAIR = '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6';

export const meta = {
  summary: 'open a DLMM position (WRITE — not yet implemented)',
  params: [
    { name: '[lbPair]', desc: 'DLMM pool to open a position in (default: a SOL/USDC pool)' },
  ],
};

export default async function run(ctx: Context, args: string[]): Promise<void> {
  const lbPair = args[0] ?? DEFAULT_LBPAIR;

  // Loading the wallet up front confirms the write path is wired: this throws a
  // clear error if PRIVATE_KEY is unset, exactly as a real write script would.
  const wallet = ctx.wallet();
  console.log(`  signer: ${wallet.publicKey.toBase58()}`);
  console.log(`  pool:   ${lbPair}`);

  // TODO (follow-up: src/meteora/dlmm/tx/):
  //   1. const pool = await getLbPair(ctx.connection, lbPair)
  //   2. const { ixs, positionKeypair } = buildAddLiquidity({ pool, owner: wallet.publicKey, amounts, binRange })
  //   3. const tx = new Transaction().add(...ixs)
  //   4. await sendAndConfirmTransaction(ctx.connection, tx, [wallet, positionKeypair])
  throw new Error(
    'not implemented — the Meteora DLMM tx layer (add-liquidity builder) is a ' +
      'follow-up. The read scripts and wallet wiring are ready; see the TODO above.'
  );
}
