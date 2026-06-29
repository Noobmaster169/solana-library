/* eslint-disable no-console */
import {
  createJupiterClient,
  getPrices,
  getToken,
  getTrendingTokens,
} from '../src';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const JUP = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';

async function main() {
  // No API key needed: defaults to the free lite-api.jup.ag host.
  // Set JUPITER_API_KEY (or pass { apiKey }) to use the Pro host.
  const client = createJupiterClient();
  console.log('using host:', client.baseUrl);

  // 1. Prices for several mints at once, aligned to the input order.
  const [sol, usdc, jup] = await getPrices(client, [SOL, USDC, JUP]);
  console.log('SOL price:', sol?.usdPrice);
  console.log('USDC price:', usdc?.usdPrice, '(expect ~1)');
  console.log('JUP price:', jup?.usdPrice);

  // 2. Full token information for a single mint.
  const token = await getToken(client, JUP);
  console.log(
    'JUP token:',
    token && `${token.symbol} — verified=${token.isVerified} holders=${token.holderCount}`
  );

  // 3. Trending tokens over the last 24h.
  const trending = await getTrendingTokens(client, 'toptrending', '24h');
  console.log('top trending (24h):', trending.slice(0, 5).map((t) => t.symbol));

  console.log('\nsmoke test complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
