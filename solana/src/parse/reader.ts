import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';

/**
 * A sequential cursor over account bytes — the entire parsing primitive.
 *
 * Account data is just a fixed layout of fields laid end to end. A parser walks
 * the buffer top to bottom, reading one field at a time; the reader tracks the
 * offset so you don't have to. That's all you need to turn raw bytes into a
 * typed object — no codec framework, no serialization.
 *
 * Wide integers (u64+) decode to `BigNumber` because they routinely exceed
 * `Number.MAX_SAFE_INTEGER`; small ints come back as plain numbers.
 */
export class BufferReader {
  /** Current read position. Mutate via the read methods, or `skip`/`seek`. */
  offset: number;

  private readonly buf: Buffer;

  constructor(buf: Buffer, offset = 0) {
    this.buf = buf;
    this.offset = offset;
  }

  // --- unsigned integers that fit safely in a JS number ---
  u8(): number {
    const v = this.buf.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }

  u16(): number {
    const v = this.buf.readUInt16LE(this.offset);
    this.offset += 2;
    return v;
  }

  u32(): number {
    const v = this.buf.readUInt32LE(this.offset);
    this.offset += 4;
    return v;
  }

  // --- wide integers -> BigNumber ---
  u64(): BigNumber {
    return this.unsigned(8);
  }

  u128(): BigNumber {
    return this.unsigned(16);
  }

  u256(): BigNumber {
    return this.unsigned(32);
  }

  i64(): BigNumber {
    return this.signed(8);
  }

  i128(): BigNumber {
    return this.signed(16);
  }

  /** IEEE-754 double, little-endian. */
  f64(): BigNumber {
    const v = this.buf.readDoubleLE(this.offset);
    this.offset += 8;
    return new BigNumber(v);
  }

  bool(): boolean {
    const v = this.buf.readUInt8(this.offset) !== 0;
    this.offset += 1;
    return v;
  }

  /** A 32-byte public key. */
  publicKey(): PublicKey {
    const pk = new PublicKey(this.buf.subarray(this.offset, this.offset + 32));
    this.offset += 32;
    return pk;
  }

  /** `length` raw bytes (a view into the underlying buffer). */
  bytes(length: number): Buffer {
    const slice = this.buf.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  /** Advance the cursor without reading (e.g. over padding). */
  skip(length: number): this {
    this.offset += length;
    return this;
  }

  /** Jump to an absolute offset. */
  seek(offset: number): this {
    this.offset = offset;
    return this;
  }

  private unsigned(size: number): BigNumber {
    const slice = this.buf.subarray(this.offset, this.offset + size);
    this.offset += size;
    let result = 0n;
    for (let i = size - 1; i >= 0; i -= 1) {
      result = (result << 8n) | BigInt(slice[i]); // little-endian
    }
    return new BigNumber(result.toString());
  }

  private signed(size: number): BigNumber {
    const slice = this.buf.subarray(this.offset, this.offset + size);
    this.offset += size;
    let result = 0n;
    for (let i = size - 1; i >= 0; i -= 1) {
      result = (result << 8n) | BigInt(slice[i]);
    }
    const bits = BigInt(size * 8);
    if (result & (1n << (bits - 1n))) result -= 1n << bits; // two's complement
    return new BigNumber(result.toString());
  }
}
