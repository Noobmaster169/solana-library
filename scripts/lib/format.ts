/* eslint-disable no-console */
// Render raw SDK "view" results (dynamic objects of BN / OraclePrice / primitive
// fields) for the read scripts.

/** A raw view field (BN / OraclePrice / primitive) → a readable string. */
export function formatViewField(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('price' in o && 'exponent' in o) {
      const exp = Number(String(o.exponent));
      return String(Number(String(o.price)) * 10 ** exp);
    }
    const s = String(v);
    return s === '[object Object]' ? JSON.stringify(v) : s;
  }
  return String(v);
}

/** Print each top-level field of a raw view result under a label. */
export function dumpViewResult(label: string, raw: Record<string, unknown>): void {
  console.log(`  ${label}:`);
  for (const [k, val] of Object.entries(raw)) {
    console.log(`    ${k.padEnd(22)} ${formatViewField(val)}`);
  }
}
