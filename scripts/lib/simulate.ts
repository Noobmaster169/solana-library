/* eslint-disable no-console */
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import type { DlmmZapBundle } from '@meteora';

/**
 * Simulate each transaction in a zap bundle against live RPC without signing or
 * sending. Uses replaceRecentBlockhash + sigVerify:false so no funds or valid
 * signatures are needed. Prints per-tx logs and any error.
 *
 * Caveat: simulation is per-tx, so cross-tx ordering (ledger → main) is NOT
 * validated end-to-end — a later tx may error because an earlier one's state
 * change isn't applied. Treated as expected; we're checking account resolution
 * and program acceptance, not a full dry run.
 */
export async function simulateBundle(
  connection: Connection,
  bundle: DlmmZapBundle,
  feePayer: PublicKey
): Promise<void> {
  console.log(`  route: ${bundle.route}`);
  console.log(`  transactions: ${bundle.transactions.length}`);
  if (bundle.position) {
    console.log(`  new position: ${bundle.position.publicKey.toBase58()}`);
  }
  // A blockhash is only needed to compile the message; replaceRecentBlockhash
  // swaps in a fresh one at simulation time, and sigVerify:false skips signing.
  const { blockhash } = await connection.getLatestBlockhash();
  let i = 0;
  for (const { label, transaction } of bundle.transactions) {
    transaction.feePayer = feePayer;
    transaction.recentBlockhash = blockhash;
    const vtx = new VersionedTransaction(transaction.compileMessage());
    const sim = await connection.simulateTransaction(vtx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });
    const err = sim.value.err;
    console.log(
      `  [${i}] ${label}: ${err ? 'ERR ' + JSON.stringify(err) : 'accepted'}`
    );
    if (err && sim.value.logs) {
      for (const line of sim.value.logs.slice(-6)) console.log(`       ${line}`);
    }
    i += 1;
  }
  console.log(
    '  (per-tx sim — cross-tx ordering not validated; errors on later txs may be expected)'
  );
}
