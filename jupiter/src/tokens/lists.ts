import { JupiterClient } from '../client/client';
import {
  TokenInfo,
  TokenTag,
  TrendingCategory,
  TrendingInterval,
} from './types';

/**
 * Tokens carrying a given tag, e.g. `verified` or `lst` (liquid staking
 * tokens). Maps to `GET /tokens/v2/tag`.
 */
export async function getTokensByTag(
  client: JupiterClient,
  tag: TokenTag
): Promise<TokenInfo[]> {
  return client.get<TokenInfo[]>('/tokens/v2/tag', { query: tag });
}

/**
 * Trending / top tokens for a category over a time interval. Maps to
 * `GET /tokens/v2/{category}/{interval}`.
 */
export async function getTrendingTokens(
  client: JupiterClient,
  category: TrendingCategory = 'toptrending',
  interval: TrendingInterval = '24h'
): Promise<TokenInfo[]> {
  return client.get<TokenInfo[]>(`/tokens/v2/${category}/${interval}`);
}

/** Recently listed tokens. Maps to `GET /tokens/v2/recent`. */
export async function getRecentTokens(
  client: JupiterClient
): Promise<TokenInfo[]> {
  return client.get<TokenInfo[]>('/tokens/v2/recent');
}
