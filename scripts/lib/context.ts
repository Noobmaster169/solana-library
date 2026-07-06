// ---------------------------------------------------------------------------
// Shared bootstrap for every feature script.
//
// Loads `.env`, builds a Connection and a Jupiter client eagerly (reads need no
// secret), and exposes a LAZY wallet loader — so read scripts run with no
// PRIVATE_KEY set, and only write scripts pay the cost (and the error) of
// requiring one.
// ---------------------------------------------------------------------------
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createConnection } from '@solana';
import { createJupiterClient, type JupiterClient } from '@jupiter';

export interface Context {
  /** Live RPC connection (SOLANA_RPC, else public mainnet-beta). */
  connection: Connection;
  /** Jupiter API client (free host unless JUPITER_API_KEY is set). */
  jupiter: JupiterClient;
  /**
   * The signing wallet, loaded on first call from the keypair file at
   * KEYPAIR_PATH. Throws a clear error if unset/unreadable — reads never call
   * this, writes always do.
   */
  wallet(): Keypair;
}

/** Expand a leading `~` to the user's home directory, then absolutize. */
function expandHome(p: string): string {
  return resolve(p.startsWith('~') ? p.replace(/^~/, homedir()) : p);
}

/** Load a Keypair from the file at KEYPAIR_PATH (solana-keygen id.json). */
function loadKeypair(): Keypair {
  const path = process.env['KEYPAIR_PATH']?.trim();
  if (!path) {
    throw new Error(
      'KEYPAIR_PATH is not set. This script signs a transaction — point it at a ' +
        'Solana keypair file (e.g. ~/.config/solana/id.json) in your .env.'
    );
  }
  const file = expandHome(path);
  let contents: string;
  try {
    contents = readFileSync(file, 'utf8').trim();
  } catch {
    throw new Error(`could not read keypair file at KEYPAIR_PATH: ${file}`);
  }
  // Standard solana-keygen files are a JSON byte array; also accept a base58
  // secret key stored as the file's contents.
  const bytes = contents.startsWith('[')
    ? Uint8Array.from(JSON.parse(contents) as number[])
    : bs58.decode(contents);
  return Keypair.fromSecretKey(bytes);
}

export function createContext(): Context {
  let cached: Keypair | undefined;
  return {
    connection: createConnection(),
    jupiter: createJupiterClient(),
    wallet() {
      return (cached ??= loadKeypair());
    },
  };
}

/** One positional parameter a script accepts. */
export interface ScriptParam {
  /** Display name, e.g. `owner` or `[mint...]` (`[]` = optional, `...` = variadic). */
  name: string;
  /** What it is and how it defaults when omitted. */
  desc: string;
}

/** Metadata every feature script exports alongside its default run function. */
export interface ScriptMeta {
  /** One-line summary shown in the script list. */
  summary: string;
  /** Positional parameters, in order. Rendered by `--help` and the README. */
  params?: ScriptParam[];
}

/** Standard shape every feature script exports as its default. */
export type FeatureScript = (ctx: Context, args: string[]) => Promise<void>;
