import { PublicKey } from '@solana/web3.js';
import {
  PROGRAM_ID as SDK_PROGRAM_ID,
  SEEDS,
  type Cluster,
} from '@flash_trade/flash-sdk-v2';

// ---------------------------------------------------------------------------
// Shared Flash Trade V2 protocol constants.
//
// Flash settles trading on a MagicBlock **ephemeral rollup (ER)**: a wallet's
// positions/orders live in a per-owner **Basket** account that is delegated to
// an ER validator, so anything position-related is read from (and written to)
// the ER RPC — separate from the base `SOLANA_RPC`.
//
// Program ids, PDA seeds, and the pool registry ship inside the SDK
// (`PoolConfig.json`); we re-export the pieces callers need so the rest of the
// module never reaches into the SDK for a constant.
// ---------------------------------------------------------------------------

export type { Cluster };

/** Perpetuals program id per cluster (resolved from the SDK's PoolConfig.json). */
export const PROGRAM_ID: Record<Cluster, PublicKey> = SDK_PROGRAM_ID;

/** Default cluster for the module. Mainnet is where Flash's real markets live. */
export const DEFAULT_CLUSTER: Cluster = 'mainnet-beta';

/**
 * MagicBlock ER validator endpoints — the trading RPC. Positions, orders, and
 * every write go here; base-layer setup (deposit/delegate) uses `SOLANA_RPC`.
 */
export const ER_ENDPOINT: Record<Cluster, string> = {
  'mainnet-beta': 'https://flash.magicblock.xyz',
  devnet: 'https://devnet-as.magicblock.app',
};

/** Default trading pool. Flash's mainnet markets live under "Crypto.1". */
export const DEFAULT_POOL_NAME = 'Crypto.1';

/** PDA seeds, re-exported from the SDK so derive helpers have one source. */
export { SEEDS };
