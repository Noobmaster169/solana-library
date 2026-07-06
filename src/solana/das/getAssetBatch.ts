import axios, { AxiosResponse } from 'axios';
import { RpcEndpoint, getBasicAuthHeaders } from '../client/endpoint';
import { GetAssetBatchOutput, HeliusAsset } from './types';

/** DAS `getAssetBatch` accepts at most 1000 ids per request. */
const MAX_IDS = 1000;

function headersFor(endpoint: RpcEndpoint) {
  return {
    'Content-Type': 'application/json',
    ...(endpoint.basicAuth
      ? getBasicAuthHeaders(
          endpoint.basicAuth.username,
          endpoint.basicAuth.password
        )
      : {}),
  };
}

async function getAssetBatchUnsafe(
  endpoint: RpcEndpoint,
  ids: string[]
): Promise<(HeliusAsset | null)[]> {
  if (ids.length === 0) return [];
  const res = await axios.post<unknown, AxiosResponse<GetAssetBatchOutput>>(
    endpoint.url,
    {
      jsonrpc: '2.0',
      id: Math.random().toString(),
      method: 'getAssetBatch',
      params: { ids },
    },
    { headers: headersFor(endpoint) }
  );
  return res.data.result;
}

/**
 * Fetch DAS assets for a list of mint/asset ids, transparently deduped and
 * chunked at the 1000-id limit. Result order follows the deduped id order;
 * entries may be `null` for unknown ids.
 */
export async function getAssetBatch(
  endpoint: RpcEndpoint,
  ids: string[]
): Promise<(HeliusAsset | null)[]> {
  const unique = Array.from(new Set(ids));
  if (unique.length <= MAX_IDS) return getAssetBatchUnsafe(endpoint, unique);

  const assets: (HeliusAsset | null)[] = [];
  for (let i = 0; i < unique.length; i += MAX_IDS) {
    // eslint-disable-next-line no-await-in-loop
    const chunk = await getAssetBatchUnsafe(endpoint, unique.slice(i, i + MAX_IDS));
    assets.push(...chunk);
  }
  return assets;
}

/** Same as {@link getAssetBatch}, returned as a map keyed by asset id. */
export async function getAssetBatchAsMap(
  endpoint: RpcEndpoint,
  ids: string[]
): Promise<Map<string, HeliusAsset>> {
  const assets = await getAssetBatch(endpoint, ids);
  const map = new Map<string, HeliusAsset>();
  assets.forEach((asset) => {
    if (asset) map.set(asset.id, asset);
  });
  return map;
}
