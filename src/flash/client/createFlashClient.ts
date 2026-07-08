import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { FlashPerpetualsClient } from '@flash_trade/flash-sdk-v2';
import { createConnection } from '@solana';
import {
  DEFAULT_CLUSTER,
  ER_ENDPOINT,
  PROGRAM_ID,
  type Cluster,
} from '../constants';

// FlashClient — holds the two connections Flash needs (base layer + ER
// validator) and lazily builds the official `FlashPerpetualsClient` on first
// use. Read-only by default (ephemeral wallet); pass a keypair to enable writes.

export interface FlashClientOptions {
  /** Base-layer RPC connection. Defaults to `createConnection()` (SOLANA_RPC). */
  connection?: Connection;
  /** Cluster whose program id / ER endpoint to use. Defaults to mainnet-beta. */
  cluster?: Cluster;
  /** ER validator RPC URL. Defaults to the cluster's MagicBlock endpoint. */
  erRpc?: string;
  /** Signing keypair. Omit for read-only (fetches + view simulations only). */
  keypair?: Keypair;
  /** Priority fee (micro-lamports) passed to the SDK for writes. */
  prioritizationFee?: number;
}

export interface FlashClient {
  readonly cluster: Cluster;
  /** Base-layer connection (SOLANA_RPC): init/setup/delegation. */
  readonly connection: Connection;
  /** ER validator connection: positions, orders, trades. */
  readonly erConnection: Connection;
  /** The acting wallet — the passed keypair's key, or an ephemeral read-only one. */
  readonly wallet: PublicKey;
  /** The signing keypair, or null in read-only mode. The send helpers need it. */
  readonly keypair: Keypair | null;
  /** True when no signing keypair was supplied (writes will throw). */
  readonly readOnly: boolean;
  /** The official SDK client, built once on first call. */
  sdk(): FlashPerpetualsClient;
}

export function createFlashClient(options: FlashClientOptions = {}): FlashClient {
  const cluster = options.cluster ?? DEFAULT_CLUSTER;
  const connection = options.connection ?? createConnection();
  const erRpc = options.erRpc ?? ER_ENDPOINT[cluster];
  const erConnection = new Connection(erRpc, connection.commitment ?? 'confirmed');

  // A real keypair enables writes; otherwise an ephemeral key that never signs.
  const readOnly = !options.keypair;
  const signer = options.keypair ?? Keypair.generate();
  const wallet = new Wallet(signer);

  let cached: FlashPerpetualsClient | undefined;

  return {
    cluster,
    connection,
    erConnection,
    wallet: signer.publicKey,
    keypair: options.keypair ?? null,
    readOnly,
    sdk() {
      if (cached) return cached;
      const provider = new AnchorProvider(connection, wallet, {
        commitment: connection.commitment ?? 'confirmed',
      });
      cached = new FlashPerpetualsClient(
        provider,
        undefined,
        PROGRAM_ID[cluster],
        { prioritizationFee: options.prioritizationFee },
        erRpc
      );
      return cached;
    },
  };
}
