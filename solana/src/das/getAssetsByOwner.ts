import axios, { AxiosResponse } from 'axios';
import { RpcEndpoint, getBasicAuthHeaders } from '../client/endpoint';
import {
  DisplayOptions,
  GetAssetsByOwnerOutput,
  GetAssetsByOwnerParams,
  HeliusAsset,
} from './types';

const LIMIT = 1000;
const DEFAULT_MAX_PAGE = 25;

function resolveDisplayOptions(o?: DisplayOptions): Required<DisplayOptions> {
  return {
    showCollectionMetadata: o?.showCollectionMetadata ?? true,
    showFungible: o?.showFungible ?? true,
    showGrandTotal: o?.showGrandTotal ?? true,
    showInscription: o?.showInscription ?? true,
    showNativeBalance: o?.showNativeBalance ?? true,
    showUnverifiedCollections: o?.showUnverifiedCollections ?? true,
  };
}

/**
 * Fetch every DAS asset owned by `owner`, following pagination automatically
 * (1000 per page, up to 25 pages by default — or fewer if `params.limit` is
 * set). Stops early once a page returns fewer than a full batch.
 */
export async function getAssetsByOwner(
  endpoint: RpcEndpoint,
  owner: string,
  params?: GetAssetsByOwnerParams
): Promise<HeliusAsset[]> {
  const headers = {
    'Content-Type': 'application/json',
    ...(endpoint.basicAuth
      ? getBasicAuthHeaders(
          endpoint.basicAuth.username,
          endpoint.basicAuth.password
        )
      : {}),
  };

  const maxPage = params?.limit ? Math.ceil(params.limit / LIMIT) : DEFAULT_MAX_PAGE;
  const displayOptions = resolveDisplayOptions(params);

  const items: HeliusAsset[] = [];
  let page = 0;
  while (page < maxPage) {
    page += 1;
    // eslint-disable-next-line no-await-in-loop
    const res = await axios.post<unknown, AxiosResponse<GetAssetsByOwnerOutput>>(
      endpoint.url,
      {
        jsonrpc: '2.0',
        id: Math.random().toString(),
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: owner,
          page,
          limit: LIMIT,
          sortBy: { sortBy: 'id', sortDirection: 'asc' },
          displayOptions,
        },
      },
      { headers }
    );
    items.push(...res.data.result.items);
    if (res.data.result.total !== LIMIT) break;
  }
  return items;
}
