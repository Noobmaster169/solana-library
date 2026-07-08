import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  Side,
  type ContractOraclePrice,
  type FlashPerpetualsClient,
  type PoolConfig,
} from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/createFlashClient';
import { DEFAULT_COLLATERAL, type Cluster } from '../constants';
import { getPoolConfig, findMarketBySymbol, getSupportedTokens } from '../markets';

// Shared trade resolution + conversions for the write builders. Flash's one
// subtlety: a market's *lock* custody can differ from the funding token (SOL
// longs lock JitoSOL), so `resolveTrade` keys the market on the lock symbol and
// tracks the funding symbol (swapped in by the program) separately.

/** Basis-point leverage scale: 2x → 20_000. */
export const LEVERAGE_SCALE = 10_000;

/** 'long' | 'short' → the SDK's anchor-enum Side. */
export function toSide(side: 'long' | 'short') {
  return side === 'long' ? Side.Long : Side.Short;
}

/** Whole-number leverage (e.g. 2) → the SDK's BPS-scaled BN. */
export function toLeverageBN(leverage: number): BN {
  return new BN(Math.round(leverage * LEVERAGE_SCALE));
}

/** Map token symbol → decimals for a pool (from the bundled registry). */
export function decimalsBySymbol(cluster: Cluster, poolName?: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of getSupportedTokens(cluster, poolName)) map.set(t.symbol, t.decimals);
  return map;
}

/** Whole-token amount → native BN using the token's decimals. */
export function toTokenAmount(amount: number, decimals: number): BN {
  return new BN(Math.round(amount * 10 ** decimals).toString());
}

/** Whole-USD amount → native BN (6 decimals). */
export function toUsdAmount(usd: number): BN {
  return new BN(Math.round(usd * 1_000_000).toString());
}

/** Plain USD price → ContractOraclePrice (exponent -8): `12.34` → `{ price: 1_234_000_000, exponent: -8 }`. */
export function usdToContractPrice(price: number, exponent = -8): ContractOraclePrice {
  return {
    price: new BN(Math.round(price * 10 ** -exponent).toString()),
    exponent,
  };
}

/** Everything a write builder needs to address one (target, side) market. */
export interface TradeMarket {
  sdk: FlashPerpetualsClient;
  pc: PoolConfig;
  side: ReturnType<typeof toSide>;
  targetSymbol: string;
  /** The market's collateral/lock custody symbol (e.g. JitoSOL for SOL longs). */
  lockSymbol: string;
  /** The token the caller funds/receives with (default: the market collateral). */
  fundingSymbol: string;
  marketAccount: PublicKey;
  targetDecimals: number;
  lockDecimals: number;
  fundingDecimals: number;
}

export interface TradeSelector {
  targetSymbol: string;
  side: 'long' | 'short';
  /** Token to fund/receive with; defaults to the market's collateral asset. */
  collateralSymbol?: string;
  poolName?: string;
}

/** Resolve the market + lock/funding symbols for a trade (applies lock override). */
export function resolveTrade(flash: FlashClient, sel: TradeSelector): TradeMarket {
  const sdk = flash.sdk();
  const side = toSide(sel.side);

  // Searches every pool unless the caller pins one, so equities/forex/metals
  // resolve the same way crypto does.
  const base = findMarketBySymbol(sel.targetSymbol, sel.side, {
    cluster: flash.cluster,
    poolName: sel.poolName,
  });
  const pc = getPoolConfig(flash.cluster, base.pool);

  // The lock asset is fixed by the market (SOL longs lock JitoSOL, shorts lock
  // USDC); funding is the caller's capital, swapped in when it differs.
  const lockSymbol = sdk.resolveCollateralSymbol(base.targetSymbol, base.collateralSymbol, side);
  const marketConfig = sdk.findMarketConfig(pc, base.targetSymbol, lockSymbol, side);
  const fundingSymbol = sel.collateralSymbol ?? DEFAULT_COLLATERAL;

  const decimals = decimalsBySymbol(flash.cluster, sel.poolName);
  return {
    sdk,
    pc,
    side,
    targetSymbol: base.targetSymbol,
    lockSymbol,
    fundingSymbol,
    marketAccount: marketConfig.marketAccount,
    targetDecimals: decimals.get(base.targetSymbol) ?? 0,
    lockDecimals: decimals.get(lockSymbol) ?? 0,
    fundingDecimals: decimals.get(fundingSymbol) ?? 0,
  };
}

/** Oracle price from a view sim: fixed-point `price` with a base-10 `exponent`. */
export interface QuoteOraclePrice {
  price: BN;
  exponent: number | BN;
}

/** Decoded `views.getOpenPositionQuote` result (the SDK types it as `any`). */
export interface OpenQuoteResult {
  entryPrice: QuoteOraclePrice;
  liquidationPrice: QuoteOraclePrice;
  sizeUsd: BN;
  sizeAmount: BN;
  collateralUsd: BN;
  totalFeeUsd: BN;
  leverage: BN;
  availableLiquidityUsd: BN;
  swapRequired: boolean;
}

/** A view-sim oracle price → `{ price, exponent }` BNs (for slippage bounding). */
export function oraclePriceToBN(op: QuoteOraclePrice): { price: BN; exponent: BN } {
  return { price: new BN(op.price.toString()), exponent: new BN(op.exponent.toString()) };
}

/** Simulate opening a position on the ER — the shared quote the view and builder read. */
export function simulateOpenQuote(
  t: TradeMarket,
  amountIn: BN,
  leverage: BN,
  receivingSymbol: string = t.fundingSymbol
): Promise<OpenQuoteResult> {
  return t.sdk.views.getOpenPositionQuote(t.pc, {
    market: t.marketAccount,
    targetSymbol: t.targetSymbol,
    collateralSymbol: t.lockSymbol,
    receivingSymbol,
    amountIn,
    leverage,
  }) as Promise<OpenQuoteResult>;
}

/** Current mark (oracle) price for a market, via a nominal 1x quote. */
export async function fetchMarkPrice(t: TradeMarket): Promise<{ price: BN; exponent: BN }> {
  const oneLockToken = new BN(10).pow(new BN(t.lockDecimals));
  const q = await simulateOpenQuote(t, oneLockToken, new BN(LEVERAGE_SCALE), t.lockSymbol);
  return oraclePriceToBN(q.entryPrice);
}
