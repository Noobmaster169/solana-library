/** Per-interval swap/market statistics attached to a {@link TokenInfo}. */
export type SwapStats = {
  priceChange?: number;
  holderChange?: number;
  liquidityChange?: number;
  volumeChange?: number;
  buyVolume?: number;
  sellVolume?: number;
  buyOrganicVolume?: number;
  sellOrganicVolume?: number;
  numBuys?: number;
  numSells?: number;
  numTraders?: number;
  numOrganicBuyers?: number;
  numNetBuyers?: number;
};

/** On-chain mint safety signals attached to a {@link TokenInfo}. */
export type TokenAudit = {
  isSus?: boolean;
  mintAuthorityDisabled?: boolean;
  freezeAuthorityDisabled?: boolean;
  topHoldersPercentage?: number;
  devBalancePercentage?: number;
  devMints?: number;
};

/** A token record from the `GET /tokens/v2/*` endpoints. */
export type TokenInfo = {
  /** Mint address. */
  id: string;
  name: string;
  symbol: string;
  /** Logo URL, or `null`. */
  icon: string | null;
  decimals: number;
  tokenProgram: string;
  createdAt: string;
  twitter?: string;
  website?: string;
  discord?: string;
  instagram?: string;
  tiktok?: string;
  dev?: string;
  circSupply: number | null;
  totalSupply: number | null;
  /** Fully diluted valuation. */
  fdv: number | null;
  mcap: number | null;
  usdPrice: number | null;
  priceBlockId: number | null;
  liquidity: number | null;
  holderCount: number | null;
  apy?: { jupEarn: number };
  /** Organic-activity score, 0–100. */
  organicScore: number;
  organicScoreLabel: 'high' | 'medium' | 'low';
  isVerified: boolean | null;
  tags: string[] | null;
  audit: TokenAudit | null;
  firstPool?: { id: string; createdAt: string } | null;
  stats5m?: SwapStats | null;
  stats1h?: SwapStats | null;
  stats6h?: SwapStats | null;
  stats24h?: SwapStats | null;
  updatedAt: string;
};

/** Tags accepted by `GET /tokens/v2/tag`. */
export type TokenTag = 'verified' | 'lst';

/** Categories accepted by `GET /tokens/v2/{category}/{interval}`. */
export type TrendingCategory =
  | 'toptrending'
  | 'toptraded'
  | 'toporganicscore';

/** Time intervals accepted by the trending endpoint. */
export type TrendingInterval = '5m' | '1h' | '6h' | '24h';
