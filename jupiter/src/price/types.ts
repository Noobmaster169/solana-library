/** A single token's pricing data, as returned by `GET /price/v3`. */
export type TokenPrice = {
  /** Current USD price. */
  usdPrice: number;
  /** Token decimals. */
  decimals: number;
  /** Solana block at which the price was computed. */
  blockId: number;
  /** 24-hour price change, as a percentage. */
  priceChange24h: number;
  /** Total USD liquidity across pools. */
  liquidity?: number;
  /** When the token was created (fixed for legacy mints like SOL/USDC). */
  createdAt?: string;
};

/** Raw `GET /price/v3` response: a map keyed by mint address. */
export type GetPriceResponse = Record<string, TokenPrice>;
