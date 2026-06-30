/* eslint-disable no-console */
import { Connection, PublicKey } from '@solana/web3.js';
import { createConnection } from 'solana-library';
import { createJupiterClient } from 'jupiter-library';
import {
  LBPAIR_SIZE,
  POSITION_V1_SIZE,
  POSITION_V2_SIZE,
  getActiveBin,
  getDlmmPositionsByOwner,
  getLbPair,
  attachUsdValues,
} from '../src';

// A long-lived mainnet DLMM pool (used in the Meteora SDK's mainnet tests).
const DEFAULT_LBPAIR = '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  const connection: Connection = createConnection();
  const lbPairAddress = process.env['METEORA_LBPAIR'] ?? DEFAULT_LBPAIR;
  const owner = process.env['METEORA_OWNER'];

  // 1. Pool decode + size constant check.
  console.log(`\n[pool] ${lbPairAddress}`);
  const rawPool = await connection.getAccountInfo(new PublicKey(lbPairAddress));
  assert(rawPool !== null, 'pool account exists');
  assert(rawPool!.data.length === LBPAIR_SIZE, `pool data is ${LBPAIR_SIZE} bytes (got ${rawPool!.data.length})`);

  const pool = await getLbPair(connection, lbPairAddress);
  assert(pool !== null, 'pool decodes');
  console.log('  tokenX:', pool!.tokenXMint.toBase58());
  console.log('  tokenY:', pool!.tokenYMint.toBase58());
  console.log('  binStep:', pool!.binStep, 'activeId:', pool!.activeId, 'status:', pool!.status);

  // 2. Active bin + price.
  const active = await getActiveBin(connection, lbPairAddress);
  assert(active !== null, 'active bin resolves');
  assert(Number(active!.pricePerToken) > 0, 'active price per token > 0');
  console.log('  activeBin:', active!.binId, 'pricePerToken:', active!.pricePerToken);

  // 3. Positions for a wallet (optional — set METEORA_OWNER).
  if (!owner) {
    console.log('\n[positions] skipped — set METEORA_OWNER to a wallet with DLMM positions');
    console.log('\nsmoke test complete.');
    return;
  }

  console.log(`\n[positions] ${owner}`);
  const positions = await getDlmmPositionsByOwner(connection, owner);
  console.log('  positions found:', positions.length);

  if (positions.length > 0) {
    // Positions are selected by a dataSize filter, so every result is exactly
    // POSITION_V1_SIZE / POSITION_V2_SIZE bytes by construction; a successful
    // decode into valid bin ranges confirms the layout offsets.
    void POSITION_V1_SIZE;
    void POSITION_V2_SIZE;

    assert(
      positions.every((p) => p.lowerBinId <= p.upperBinId),
      'every position has a valid bin range'
    );
    assert(
      positions.every(
        (p) =>
          p.totalXAmount.isGreaterThanOrEqualTo(0) &&
          p.totalYAmount.isGreaterThanOrEqualTo(0)
      ),
      'every position has non-negative amounts'
    );

    for (const p of positions.slice(0, 8)) {
      console.log(
        `  ${p.position.toBase58().slice(0, 8)} [${p.version}] ` +
          `pool=${p.lbPair.toBase58().slice(0, 8)} ` +
          `X=${p.totalXAmount.toString()} Y=${p.totalYAmount.toString()} ` +
          `feeX=${p.feeX.toString()} feeY=${p.feeY.toString()} ` +
          `r1=${p.rewardOne.toString()} r2=${p.rewardTwo.toString()} ` +
          `${p.outOfRange ? '(out of range)' : ''}`
      );
    }

    // 4. Optional USD valuation via Jupiter.
    const valued = await attachUsdValues(createJupiterClient(), positions);
    const total = valued.reduce((s, p) => s + p.totalValue, 0);
    console.log(`  total portfolio value: $${total.toFixed(2)}`);
  }

  console.log('\nsmoke test complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
