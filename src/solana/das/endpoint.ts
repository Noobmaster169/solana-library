import { RpcEndpoint, urlToRpcEndpoint } from '../client/endpoint';

const DEFAULT_DAS = 'https://api.mainnet-beta.solana.com';

/**
 * Resolve the DAS (Digital Asset Standard) endpoint — Helius and compatible
 * providers. Defaults to `process.env.SOLANA_DAS_ENDPOINT`. Note that the
 * public mainnet RPC does **not** implement DAS methods, so set this to a
 * provider that does.
 */
export function getDasEndpoint(url?: string): RpcEndpoint {
  return urlToRpcEndpoint(url ?? process.env['SOLANA_DAS_ENDPOINT'] ?? DEFAULT_DAS);
}
