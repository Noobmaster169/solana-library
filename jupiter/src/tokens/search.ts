import { JupiterClient } from '../client/client';
import { TokenInfo } from './types';

/** `GET /tokens/v2/search` accepts at most 100 comma-separated queries. */
const MAX_QUERIES = 100;

/**
 * Search for tokens by mint address, symbol, or name. Pass a single query
 * string, or up to 100 comma-separable values as an array. Returns the matching
 * tokens (empty array if none match).
 */
export async function searchTokens(
  client: JupiterClient,
  query: string | string[]
): Promise<TokenInfo[]> {
  const queries = Array.isArray(query) ? query : [query];
  if (queries.length === 0) return [];

  const results: TokenInfo[] = [];
  for (let i = 0; i < queries.length; i += MAX_QUERIES) {
    const chunk = queries.slice(i, i + MAX_QUERIES).join(',');
    // eslint-disable-next-line no-await-in-loop
    const page = await client.get<TokenInfo[]>('/tokens/v2/search', {
      query: chunk,
    });
    results.push(...page);
  }
  return results;
}

/**
 * Token info for each mint, **positionally aligned** to the input array. `null`
 * for mints Jupiter doesn't know about. Deduped and chunked internally.
 */
export async function getTokens(
  client: JupiterClient,
  mints: string[]
): Promise<(TokenInfo | null)[]> {
  const map = await getTokensAsMap(client, mints);
  return mints.map((mint) => map.get(mint) ?? null);
}

/** Same as {@link getTokens}, returned as a map keyed by mint address. */
export async function getTokensAsMap(
  client: JupiterClient,
  mints: string[]
): Promise<Map<string, TokenInfo>> {
  const unique = Array.from(new Set(mints));
  const tokens = await searchTokens(client, unique);
  const map = new Map<string, TokenInfo>();
  tokens.forEach((token) => map.set(token.id, token));
  return map;
}

/** Convenience: token info for a single mint, or `null` if not found. */
export async function getToken(
  client: JupiterClient,
  mint: string
): Promise<TokenInfo | null> {
  const map = await getTokensAsMap(client, [mint]);
  return map.get(mint) ?? null;
}
