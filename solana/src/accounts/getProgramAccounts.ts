import {
  Commitment,
  Connection,
  GetProgramAccountsFilter,
} from '@solana/web3.js';
import { Address, toPublicKey } from '../parse/types';

export type GetProgramAccountsOptions = {
  filters?: GetProgramAccountsFilter[];
  commitment?: Commitment;
  /**
   * Guard against runaway scans. When set, the program is first queried with a
   * zero-length `dataSlice` (cheap — keys only, no data), and if more than
   * `maxAccounts` match the call throws instead of pulling megabytes of data.
   * Leave undefined to fetch unconditionally.
   */
  maxAccounts?: number;
};

/**
 * Raw `getProgramAccounts` with a built-in safety valve.
 *
 * The two-phase optimization (count via `dataSlice:{offset:0,length:0}`, then
 * fetch) mirrors how the portfolio service avoids accidentally downloading an
 * entire program's account set.
 */
export async function getProgramAccounts(
  connection: Connection,
  programId: Address,
  options: GetProgramAccountsOptions = {}
) {
  const { filters, commitment = 'confirmed', maxAccounts } = options;
  const programPk = toPublicKey(programId);

  const config = {
    commitment,
    encoding: 'base64' as const,
    filters,
  };

  if (maxAccounts !== undefined && maxAccounts >= 0) {
    const keysOnly = await connection.getProgramAccounts(programPk, {
      ...config,
      dataSlice: { offset: 0, length: 0 },
    });
    if (keysOnly.length > maxAccounts) {
      throw new Error(
        `Too many accounts to fetch (${keysOnly.length} > ${maxAccounts})`
      );
    }
  }

  return connection.getProgramAccounts(programPk, config);
}
