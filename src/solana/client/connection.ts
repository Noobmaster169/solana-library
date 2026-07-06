import { Connection, FetchMiddleware } from '@solana/web3.js';
import { getBasicAuthHeaders, urlToRpcEndpoint } from './endpoint';

const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

export type CreateConnectionOptions = {
  /**
   * RPC URL. Defaults to `process.env.SOLANA_RPC`, then public mainnet-beta.
   * Basic-auth credentials embedded in the URL are moved into headers.
   */
  url?: string;
  /**
   * Log a running tally of RPC methods to the console. Defaults to the
   * `SOLANA_RPC_LOGS=true` env flag. Handy for spotting accidental N+1 calls.
   */
  logRequests?: boolean;
};

/**
 * Create a web3.js `Connection`, the only stateful object in the library.
 *
 * Deliberately thin: it wires up basic-auth and optional request logging, and
 * nothing else. There is no retry/failover/rate-limiting layer here — by
 * design. The library's job is to make *querying* simple, not to second-guess
 * your RPC provider.
 */
export function createConnection(
  options: CreateConnectionOptions = {}
): Connection {
  const url = options.url ?? process.env['SOLANA_RPC'] ?? DEFAULT_RPC;
  const endpoint = urlToRpcEndpoint(url);

  const httpHeaders = endpoint.basicAuth
    ? getBasicAuthHeaders(
        endpoint.basicAuth.username,
        endpoint.basicAuth.password
      )
    : undefined;

  const logRequests =
    options.logRequests ?? process.env['SOLANA_RPC_LOGS'] === 'true';

  let fetchMiddleware: FetchMiddleware | undefined;
  if (logRequests) {
    const reqs: Record<string, number> = { total: 0 };
    fetchMiddleware = (info, init, fetch) => {
      const { method } = JSON.parse(init?.body?.toString() || '{}');
      if (typeof method === 'string') {
        reqs[method] = (reqs[method] ?? 0) + 1;
        reqs['total'] += 1;
        if (reqs['total'] % 5 === 1) {
          // eslint-disable-next-line no-console
          console.log(`RPC Requests: ${JSON.stringify(reqs, undefined, 2)}`);
        }
      }
      fetch(info, init);
    };
  }

  return new Connection(endpoint.url, { httpHeaders, fetchMiddleware });
}
