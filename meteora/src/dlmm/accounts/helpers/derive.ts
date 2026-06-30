import { PublicKey } from '@solana/web3.js';
import { toPublicKey, type Address } from 'solana-library';
import { DLMM_PROGRAM_ID, MAX_BIN_ARRAY_SIZE } from '../../constants';

// ---------------------------------------------------------------------------
// PDA derivation for DLMM accounts. Seeds mirror the Meteora program exactly;
// signed indices/ids are encoded as little-endian two's-complement via BigInt
// so we avoid pulling in bn.js.
// ---------------------------------------------------------------------------

/** Little-endian, two's-complement encoding of a signed integer over `bytes`. */
function signedToLe(value: number, bytes: number): Buffer {
  const bits = BigInt(bytes) * 8n;
  let v = BigInt(value);
  if (v < 0n) v += 1n << bits;
  const buf = Buffer.alloc(bytes);
  if (bytes === 4) buf.writeUInt32LE(Number(v));
  else buf.writeBigUInt64LE(v);
  return buf;
}

/** The bin array index that contains `binId` (floor division by 70). */
export function binIdToBinArrayIndex(binId: number): number {
  const idx = Math.trunc(binId / MAX_BIN_ARRAY_SIZE);
  const mod = binId % MAX_BIN_ARRAY_SIZE;
  return binId < 0 && mod !== 0 ? idx - 1 : idx;
}

/** Inclusive [lower, upper] bin ids covered by a bin array of the given index. */
export function getBinArrayLowerUpperBinId(
  binArrayIndex: number
): [number, number] {
  const lower = binArrayIndex * MAX_BIN_ARRAY_SIZE;
  const upper = lower + MAX_BIN_ARRAY_SIZE - 1;
  return [lower, upper];
}

export function deriveBinArray(
  lbPair: Address,
  index: number,
  programId: PublicKey = DLMM_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bin_array'), toPublicKey(lbPair).toBytes(), signedToLe(index, 8)],
    programId
  );
}

export function deriveReserve(
  tokenMint: Address,
  lbPair: Address,
  programId: PublicKey = DLMM_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [toPublicKey(lbPair).toBuffer(), toPublicKey(tokenMint).toBuffer()],
    programId
  );
}

export function deriveOracle(
  lbPair: Address,
  programId: PublicKey = DLMM_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('oracle'), toPublicKey(lbPair).toBytes()],
    programId
  );
}

export function deriveBinArrayBitmapExtension(
  lbPair: Address,
  programId: PublicKey = DLMM_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bitmap'), toPublicKey(lbPair).toBytes()],
    programId
  );
}
