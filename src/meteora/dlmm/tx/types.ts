import type { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import type { StrategyType } from '@meteora-ag/dlmm';
import type BN from 'bn.js';

/** Which on-chain swap route the zap uses. */
export type ZapRoute = 'dlmm' | 'jupiter';

/** Caller's route preference; 'auto' lets the helper choose. */
export type RoutePreference = ZapRoute | 'auto';

/** Semantic label for each transaction in an ordered bundle. */
export type BundleTxLabel =
  | 'setup'
  | 'swap'
  | 'ledger'
  | 'main'
  | 'cleanup'
  | 'initBinArray'
  | 'rebalance';

export interface BundleTx {
  label: BundleTxLabel;
  transaction: Transaction;
}

/**
 * Normalized output for every write helper. `transactions` is in execution
 * order — sign and send/Jito-bundle in this sequence. `position` is present
 * only for `openDlmmPosition` (the new position NFT the caller must co-sign).
 */
export interface DlmmZapBundle {
  transactions: BundleTx[];
  position?: { publicKey: PublicKey; keypair: Keypair };
  route: ZapRoute;
}

export interface OpenDlmmPositionParams {
  /** The DLMM (LB pair) pool address. */
  lbPair: PublicKey;
  /** Mint of the single token supplied to open the position. */
  inputMint: PublicKey;
  /** Amount of `inputMint` to deploy (base units). */
  amount: BN;
  /** Wallet that will own the position and sign the bundle. */
  user: PublicKey;
  /** Lower bin offset from the active bin (negative). */
  minDeltaId: number;
  /** Upper bin offset from the active bin (positive). */
  maxDeltaId: number;
  /** Liquidity distribution strategy. Default StrategyType.Spot. */
  strategy?: StrategyType;
  /** Route preference. Default 'auto'. */
  route?: RoutePreference;
  /** Swap slippage (bps). Default 150. */
  swapSlippageBps?: number;
  /** Active-bin slippage guard. Default 50. */
  maxActiveBinSlippage?: number;
  /** Max accounts for Jupiter routing. Default 50. */
  maxAccounts?: number;
  /** Favor token X on the active bin. Default false. */
  favorXInActiveId?: boolean;
}

export interface CloseDlmmPositionParams {
  lbPair: PublicKey;
  /** Explicit position to close. If omitted, `owner` is used. */
  position?: PublicKey;
  /** Owner whose positions on `lbPair` are closed (when `position` omitted). */
  owner?: PublicKey;
  /** Wallet signing the bundle (defaults to `owner`). */
  user?: PublicKey;
  /** Mint to receive after zapping out. */
  outputMint: PublicKey;
  /** Fraction of liquidity to remove, in bps. Default 10000 (100%). */
  bps?: number;
  route?: RoutePreference;
  swapSlippageBps?: number;
}

export interface RebalanceDlmmPositionParams {
  lbPair: PublicKey;
  /** Existing position to rebalance in place. */
  position: PublicKey;
  /** Wallet signing the bundle. */
  user: PublicKey;
  /** New lower bin offset from active bin (negative). */
  minDeltaId: number;
  /** New upper bin offset from active bin (positive). */
  maxDeltaId: number;
  strategy?: StrategyType;
  route?: RoutePreference;
  swapSlippageBps?: number;
  /** Liquidity slippage (bps) for re-add. Default 150. */
  liquiditySlippageBps?: number;
  maxAccounts?: number;
  favorXInActiveId?: boolean;
}
