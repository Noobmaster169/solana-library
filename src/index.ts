// ---------------------------------------------------------------------------
// solana-defi-library — one combined toolkit for reading Solana protocols.
//
// Three simplicity layers, each keeping its own clean module structure:
//   solana/    core query layer  — accounts, parsing, tokens, DAS
//   jupiter/   Jupiter API reads — price, tokens, charts
//   meteora/   Meteora DLMM      — positions, pools, bins (built on the above)
//
// Exposed as namespaces so the three surfaces never collide and read clearly:
//
//   import { solana, jupiter, meteora } from 'solana-defi-library';
//   const conn = solana.createConnection();
//   const pool = await meteora.getLbPair(conn, address);
//
// Prefer a single module? Import it directly:
//
//   import { getLbPair } from 'solana-defi-library/meteora';
// ---------------------------------------------------------------------------

export * as solana from './solana';
export * as jupiter from './jupiter';
export * as meteora from './meteora';
