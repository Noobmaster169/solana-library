// ---------------------------------------------------------------------------
// solana-defi-library — one combined toolkit for reading Solana protocols.
//
// Four simplicity layers, each keeping its own clean module structure:
//   solana/    core query layer  — accounts, parsing, tokens, DAS
//   jupiter/   Jupiter API reads — price, tokens, charts
//   meteora/   Meteora DLMM      — positions, pools, bins (built on the above)
//   flash/     Flash Trade V2    — perps: markets, positions, quotes, open/close
//
// Exposed as namespaces so the surfaces never collide and read clearly:
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
export * as flash from './flash';
