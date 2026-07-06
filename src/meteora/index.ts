// ---------------------------------------------------------------------------
// meteora-library — a simplicity layer for Meteora on Solana.
//
// Today it implements DLMM (Liquidity Book) reads: decode positions, pools,
// and bins, and compute underlying amounts, claimable swap fees, and LM
// rewards. Built on solana-library; raw amounts by default, with opt-in
// Jupiter USD valuation. Read-only for now — `api` and `tx` layers will follow.
//
// Quick start:
//   import { getDlmmPositionsByOwner, getLbPair, getActiveBin } from 'meteora-library';
//
// Or via namespace:
//   import { dlmm } from 'meteora-library';
//   dlmm.accounts.getLbPair(connection, pool);
// ---------------------------------------------------------------------------

// Flat re-exports of the DLMM surface (core functions, decoders, constants).
export * from './dlmm';

// The same surface as a namespace, for callers who prefer `dlmm.accounts.*`.
export * as dlmm from './dlmm';

// Client handle for the write (tx) layer.
export {
  createMeteoraClient,
  type MeteoraClient,
  type MeteoraClientOptions,
} from './client/client';
