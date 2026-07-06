// ---------------------------------------------------------------------------
// solana-library — a simplicity layer for querying Solana.
//
// Fetch raw account bytes, parse them with fixed beet layouts, and batch RPC
// queries efficiently. No retry/failover/rate-limiting layer (by design), no
// heavy abstractions — just the core querying primitives.
// ---------------------------------------------------------------------------

// Client
export {
  createConnection,
  type CreateConnectionOptions,
} from './client/connection';
export {
  urlToRpcEndpoint,
  getBasicAuthHeaders,
  type RpcEndpoint,
} from './client/endpoint';

// Parsing primitives
export {
  type ParsedAccount,
  type Parser,
  type Address,
  toPublicKey,
} from './parse/types';
export { BufferReader } from './parse/reader';
export {
  parseMintAccount,
  parseTokenAccount,
  MINT_ACCOUNT_SIZE,
  TOKEN_ACCOUNT_SIZE,
  AccountState,
  type MintAccount,
  type TokenAccount,
} from './parse/structs';
export { anchorSighash } from './parse/anchorSighash';

// Account fetching — individual + multiple, raw + parsed
export { getMultipleAccountsInfo } from './accounts/getMultipleAccountsInfo';
export { getParsedAccountInfo } from './accounts/getParsedAccountInfo';
export { getParsedMultipleAccountInfo } from './accounts/getParsedMultipleAccountInfo';
export {
  getProgramAccounts,
  type GetProgramAccountsOptions,
} from './accounts/getProgramAccounts';
export { getProgramAccount } from './accounts/getProgramAccount';
export { getParsedProgramAccounts } from './accounts/getParsedProgramAccounts';
export { getParsedProgramAccount } from './accounts/getParsedProgramAccount';
export { dataSizeFilter, memcmpFilter } from './accounts/filters';

// Tokens
export {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_IDS,
  NATIVE_SOL_MINT,
  WRAPPED_SOL_MINT,
  SOL_DECIMALS,
} from './tokens/constants';
export { getAssociatedTokenAddress } from './tokens/ata';
export {
  getTokenBalances,
  type TokenBalance,
} from './tokens/getTokenBalances';
export { getDecimals, getDecimalsAsMap } from './tokens/getDecimals';
export { getSupply } from './tokens/getSupply';

// DAS / Helius
export { getDasEndpoint } from './das/endpoint';
export { getAssetBatch, getAssetBatchAsMap } from './das/getAssetBatch';
export { getAssetsByOwner } from './das/getAssetsByOwner';
export * from './das/types';

// Concurrency & caching utilities
export { sleep } from './utils/sleep';
export { promiseTimeout } from './utils/promiseTimeout';
export { runInBatch } from './utils/runInBatch';
export { runInParallel } from './utils/runInParallel';
export { createTtlCache, type TtlCache } from './utils/ttlCache';
export {
  createKeyedTtlCache,
  type KeyedTtlCache,
} from './utils/keyedTtlCache';
