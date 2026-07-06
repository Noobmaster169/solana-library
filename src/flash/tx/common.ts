import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  Side,
  type ContractOraclePrice,
  type FlashPerpetualsClient,
  type PoolConfig,
} from '@flash_trade/flash-sdk-v2';
import type { FlashClient } from '../client/client';
import { getPoolConfig, resolveMarket, getTokens } from '../markets';

// ---------------------------------------------------------------------------
// Shared trade resolution + conversions for the write builders.
//
// The one subtlety in Flash: a market's *lock* custody can differ from the
// asset you fund with. SOL longs lock JitoSOL, so the market PDA and the
// program's `collateralSymbol` are keyed on the LOCK symbol, while the token
// you pay in is the *receiving* symbol (the program swaps it in). `resolveTrade`
// centralizes that so every builder addresses the same market consistently.
// ---------------------------------------------------------------------------

/** 'long' | 'short' → the SDK's anchor-enum Side. */
export function toSide(side: 'long' | 'short') {
  return side === 'long' ? Side.Long : Side.Short;
}

/** Map token symbol → decimals for a pool (from the bundled registry). */
export function decimalsBySymbol(poolName?: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of getTokens(undefined, poolName)) map.set(t.symbol, t.decimals);
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

/**
 * A plain USD price → ContractOraclePrice. Flash oracle prices use exponent -8,
 * so `12.34` becomes `{ price: 1_234_000_000, exponent: -8 }`.
 */
export function usdToContractPrice(
  price: number,
  exponent = -8
): ContractOraclePrice {
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
  const pc = getPoolConfig(flash.cluster, sel.poolName);
  const side = toSide(sel.side);

  // Natural market gives the target symbol + default collateral asset.
  const base = resolveMarket(sel.targetSymbol, sel.side, {
    cluster: flash.cluster,
    poolName: sel.poolName,
  });
  const fundingSymbol = sel.collateralSymbol ?? base.collateralSymbol;
  const lockSymbol = sdk.resolveCollateralSymbol(base.targetSymbol, fundingSymbol, side);
  const marketConfig = sdk.findMarketConfig(pc, base.targetSymbol, lockSymbol, side);

  const decimals = decimalsBySymbol(sel.poolName);
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

/** Current mark (oracle) price for a market, via a nominal quote. `{ price, exponent }` BNs. */
export async function fetchMarkPrice(t: TradeMarket): Promise<{ price: BN; exponent: BN }> {
  const oneLockToken = new BN(10).pow(new BN(t.lockDecimals));
  const q = await t.sdk.views.getOpenPositionQuote(t.pc, {
    market: t.marketAccount,
    targetSymbol: t.targetSymbol,
    collateralSymbol: t.lockSymbol,
    receivingSymbol: t.lockSymbol,
    amountIn: oneLockToken,
    leverage: new BN(10_000),
  });
  return {
    price: new BN(q.entryPrice.price.toString()),
    exponent: new BN(q.entryPrice.exponent.toString()),
  };
}
