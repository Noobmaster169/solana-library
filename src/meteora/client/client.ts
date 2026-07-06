import { Connection } from '@solana/web3.js';
import { Zap } from '@meteora-ag/zap-sdk';
import { createConnection } from '@solana';

// ---------------------------------------------------------------------------
// MeteoraClient — the one handle the tx layer builds on.
//
// Holds the connection + Jupiter API config and lazily constructs the official
// zap-sdk `Zap` on first write. Reads (accounts/) never touch this. No keypair
// is stored: the tx helpers return unsigned transactions for the caller to
// sign and send.
// ---------------------------------------------------------------------------

export interface MeteoraClientOptions {
  /** RPC connection. Defaults to `createConnection()` (SOLANA_RPC). */
  connection?: Connection;
  /** Jupiter API base URL. Defaults to https://api.jup.ag. */
  jupiterApiUrl?: string;
  /** Jupiter API key. Defaults to env JUPITER_API_KEY (else empty). */
  jupiterApiKey?: string;
}

export interface MeteoraClient {
  readonly connection: Connection;
  readonly jupiterApiUrl: string;
  readonly jupiterApiKey: string;
  /** The official zap-sdk client, built once on first call. */
  zap(): Zap;
}

const DEFAULT_JUPITER_API_URL = 'https://api.jup.ag';

export function createMeteoraClient(
  options: MeteoraClientOptions = {}
): MeteoraClient {
  const connection = options.connection ?? createConnection();
  const jupiterApiUrl = options.jupiterApiUrl ?? DEFAULT_JUPITER_API_URL;
  const jupiterApiKey =
    options.jupiterApiKey ?? process.env['JUPITER_API_KEY'] ?? '';

  let cached: Zap | undefined;

  return {
    connection,
    jupiterApiUrl,
    jupiterApiKey,
    zap() {
      if (cached) return cached;
      cached = new Zap(connection, { jupiterApiUrl, jupiterApiKey });
      return cached;
    },
  };
}
