// flash — a simplicity layer for Flash Trade V2 (perps) on Solana. Metadata and
// prices read the house way (pool registry + Jupiter, no SDK); position reads,
// quotes, and writes wrap `@flash_trade/flash-sdk-v2`. Reads need no wallet;
// writes take a keypair and return UNSIGNED instructions to sign and send.
//
// Quick start:
//   import { createFlashClient, getAvailableMarkets, getUserPositions } from 'solana-defi-library/flash';
//   const flash = createFlashClient();
//   const markets = getAvailableMarkets();                 // no network
//   const positions = await getUserPositions(flash, owner);

// Client + protocol constants.
export {
  createFlashClient,
  type FlashClient,
  type FlashClientOptions,
} from './client/createFlashClient';
export {
  PROGRAM_ID,
  ER_ENDPOINT,
  DEFAULT_CLUSTER,
  DEFAULT_POOL_NAME,
  BASKET_SEED,
  type Cluster,
} from './constants';

// Namespaced surfaces, then flat re-exports of the most-used entry points.
export * as markets from './markets';
export * as accounts from './accounts';
export * as views from './views';
export * as tx from './tx';

export * from './markets';
export * from './accounts';
export * from './views';
export * from './tx';
