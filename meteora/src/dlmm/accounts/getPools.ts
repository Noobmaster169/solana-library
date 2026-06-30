import { Connection, PublicKey } from '@solana/web3.js';
import {
  type Address,
  type ParsedAccount,
  dataSizeFilter,
  getParsedAccountInfo,
  getParsedMultipleAccountInfo,
  getParsedProgramAccounts,
} from 'solana-library';
import { DLMM_PROGRAM_ID } from '../constants';
import { type LbPair, LBPAIR_SIZE, parseLbPair } from './layouts';

// ---------------------------------------------------------------------------
// Pool (LbPair) reads. A decoded pool exposes its token mints, reserves,
// binStep, active bin id, fee parameters, and reward configuration.
// ---------------------------------------------------------------------------

/** Fetch and decode a single pool, or `null` if the account does not exist. */
export function getLbPair(
  connection: Connection,
  address: Address
): Promise<ParsedAccount<LbPair> | null> {
  return getParsedAccountInfo(connection, parseLbPair, address);
}

/** Fetch and decode many pools, positionally aligned to `addresses`. */
export function getLbPairs(
  connection: Connection,
  addresses: Address[]
): Promise<(ParsedAccount<LbPair> | null)[]> {
  return getParsedMultipleAccountInfo(connection, parseLbPair, addresses);
}

export type GetAllLbPairsOptions = {
  programId?: PublicKey;
  /** Throw rather than download more than this many pools. */
  maxAccounts?: number;
};

/**
 * Every pool owned by the DLMM program. This is a large scan — pass
 * `maxAccounts` to guard against pulling the entire set unintentionally.
 */
export function getAllLbPairs(
  connection: Connection,
  options: GetAllLbPairsOptions = {}
): Promise<ParsedAccount<LbPair>[]> {
  return getParsedProgramAccounts(
    connection,
    parseLbPair,
    options.programId ?? DLMM_PROGRAM_ID,
    {
      filters: [dataSizeFilter(LBPAIR_SIZE)],
      maxAccounts: options.maxAccounts,
    }
  );
}
