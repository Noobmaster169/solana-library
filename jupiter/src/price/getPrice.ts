import { JupiterClient } from '../client/client';
import { GetPriceResponse, TokenPrice } from './types';

/** `GET /price/v3` accepts at most 50 mint ids per request. */
const MAX_IDS = 50;

async function getPricesUnsafe(
  client: JupiterClient,
  mints: string[]
): Promise<GetPriceResponse> {
  if (mints.length === 0) return {};
  return client.get<GetPriceResponse>('/price/v3', { ids: mints.join(',') });
}

/**
 * USD prices for a list of mints, transparently deduped and chunked at the
 * 50-id limit, returned as a map keyed by mint address. Mints with no recent
 * trading activity are simply absent from the map.
 */
export async function getPricesAsMap(
  client: JupiterClient,
  mints: string[]
): Promise<Map<string, TokenPrice>> {
  const unique = Array.from(new Set(mints));
  const map = new Map<string, TokenPrice>();

  for (let i = 0; i < unique.length; i += MAX_IDS) {
    // eslint-disable-next-line no-await-in-loop
    const page = await getPricesUnsafe(client, unique.slice(i, i + MAX_IDS));
    for (const [mint, price] of Object.entries(page)) {
      if (price) map.set(mint, price);
    }
  }

  return map;
}

/**
 * Prices for each mint, **positionally aligned** to the input array. `null`
 * for mints Jupiter could not price (e.g. no trades in the last 7 days).
 */
export async function getPrices(
  client: JupiterClient,
  mints: string[]
): Promise<(TokenPrice | null)[]> {
  const map = await getPricesAsMap(client, mints);
  return mints.map((mint) => map.get(mint) ?? null);
}

/** Convenience: the price for a single mint, or `null` if unavailable. */
export async function getPrice(
  client: JupiterClient,
  mint: string
): Promise<TokenPrice | null> {
  const map = await getPricesAsMap(client, [mint]);
  return map.get(mint) ?? null;
}
