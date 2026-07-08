import { PublicKey } from '@solana/web3.js';

// Shared Flash Trade V2 protocol constants — hardcoded, no SDK dependency.
// Trading settles on a MagicBlock ephemeral rollup (ER): per-owner Basket
// accounts are delegated to an ER validator, read/written via the ER RPC
// (separate from the base `SOLANA_RPC`).

/** Clusters the module supports. */
export type Cluster = 'mainnet-beta' | 'devnet';

/** Perpetuals program id per cluster. */
export const PROGRAM_ID: Record<Cluster, PublicKey> = {
  'mainnet-beta': new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn'),
  devnet: new PublicKey('FTPP4jEWW1n8s2FEccwVfS9KCPjpndaswg7Nkkuz4ER4'),
};

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

/** PDA seed for the per-owner Basket account (`['basket', owner]`). */
export const BASKET_SEED = 'basket';

/** PDA seed for the per-(owner, mint) withdrawal escrow receipt account. */
export const WITHDRAWAL_ESCROW_RECEIPT_SEED = 'withdrawal_escrow_receipt';

/** Default funding asset. USDC everywhere; override per call with `collateralSymbol` to skip the swap. */
export const DEFAULT_COLLATERAL = 'USDC';
