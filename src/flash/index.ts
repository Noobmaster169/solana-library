// ---------------------------------------------------------------------------
// flash-library — a simplicity layer for Flash Trade V2 (perps) on Solana.
//
// A hybrid module: market/token metadata and USD prices are read the house way
// (bundled pool registry + Jupiter, no SDK, RPC-light), while position reads,
// quotes, and every write wrap the official `@flash_trade/flash-sdk-v2` — used
// only where its oracle/pool math and account layouts are genuinely needed.
//
// Flash trades on a MagicBlock ephemeral rollup, so a `FlashClient` carries two
// connections (base + ER). Reads need no wallet; writes take a keypair and
// return UNSIGNED instructions for the caller to sign and send.
//
// Quick start:
//   import { createFlashClient, getMarkets, getPositions } from 'flash-library';
//   const flash = createFlashClient();
//   const markets = getMarkets();                 // no network
//   const positions = await getPositions(flash, owner);
//
// Or via namespace:
//   import { flash } from 'solana-defi-library';
//   flash.createFlashClient();
// ---------------------------------------------------------------------------

// Client + protocol constants.
export {
  createFlashClient,
  type FlashClient,
  type FlashClientOptions,
} from './client/client';
export {
  PROGRAM_ID,
  ER_ENDPOINT,
  DEFAULT_CLUSTER,
  DEFAULT_POOL_NAME,
  SEEDS,
  type Cluster,
} from './constants';

// Namespaced surfaces (markets/accounts/views/tx) are added below as they land.
export * as markets from './markets';
export * as accounts from './accounts';
export * as views from './views';
export * as tx from './tx';

// Convenience flat re-exports of the most-used read/write entry points.
export * from './markets';
export * from './accounts';
export * from './views';
export * from './tx';
