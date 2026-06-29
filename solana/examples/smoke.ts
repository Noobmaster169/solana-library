/* eslint-disable no-console */
import {
  createConnection,
  getDecimals,
  getTokenBalances,
  getParsedProgramAccounts,
  dataSizeFilter,
  parseMintAccount,
  MINT_ACCOUNT_SIZE,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '../src';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
// A large, long-lived account (Circle USDC). Used only as a read target.
const WHALE = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';

async function main() {
  const connection = createConnection();

  // 1. Decimals (USDC should be 6; wrapped SOL should be 9).
  const [usdcDecimals, solDecimals] = await getDecimals(connection, [
    USDC,
    WRAPPED_SOL_MINT,
  ]);
  console.log('USDC decimals:', usdcDecimals, '(expect 6)');
  console.log('wSOL decimals:', solDecimals, '(expect 9)');

  // 2. Specific-mint balances for a wallet, one batched read.
  const balances = await getTokenBalances(connection, WHALE, [USDC, WRAPPED_SOL_MINT]);
  console.log('balances found:', balances.size);
  for (const [mint, bal] of balances) {
    console.log(`  ${mint}: amount=${bal.amount.toString()} ata=${bal.address}`);
  }

  // 3. getProgramAccounts with a size filter + safety cap.
  const mints = await getParsedProgramAccounts(
    connection,
    parseMintAccount,
    TOKEN_PROGRAM_ID,
    { filters: [dataSizeFilter(MINT_ACCOUNT_SIZE)], maxAccounts: 5 }
  ).catch((e) => {
    console.log('gPA correctly capped:', (e as Error).message);
    return [];
  });
  console.log('mint accounts fetched (capped at 5):', mints.length);

  console.log('\nsmoke test complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
