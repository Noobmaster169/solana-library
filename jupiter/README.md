# jupiter-library

A **simplicity layer for Jupiter's APIs**. Two jobs, nothing more:

> Fetch token **prices** (`/price/v3`) and token **information** (`/tokens/v2/*`),
> with clean batched functions over a thin HTTP client.

There is **no** retry/failover/rate-limiting layer (Jupiter's rate limits are
your API tier's concern), no caching, no codegen. Just clean, composable
functions you can copy into any project.

## Install

This is a **drop-in source folder** — copy `src/` into your project, or import
it directly. The only runtime dependency is `axios`:

```bash
npm install axios
```

Then `npm install` here to typecheck the library itself:

```bash
npm install
npm run typecheck     # tsc --noEmit
npm run smoke         # optional live read against the free Jupiter API
```

## Free vs. Pro host

Jupiter exposes two hosts. The client picks the right one automatically:

| Host                  | When                          | Auth                |
|-----------------------|-------------------------------|---------------------|
| `lite-api.jup.ag`     | no API key (default)          | none — great for examples |
| `api.jup.ag`          | API key present               | `x-api-key` header  |

```ts
createJupiterClient();                       // free host
createJupiterClient({ apiKey: 'jup_...' });  // Pro host, or set JUPITER_API_KEY
```

## Conventions

- **Mints are plain strings** (base-58 addresses). No wrapper types at call sites.
- **Positionally aligned results.** Batch reads return an array the same length
  and order as the input (`result[i]` ↔ `input[i]`), or an `AsMap` variant keyed
  by mint. Never reshuffled.
- **Invisible chunking.** The 50-id price cap and the 100-query search cap are
  handled internally; pass as many mints as you like.
- **Missing data is `null`**, not an error. Prices for untraded tokens and
  unknown mints come back `null` in aligned arrays / absent from maps.

## Quick start

```ts
import {
  createJupiterClient,
  getPrices,
  getToken,
  getTokensByTag,
  getTrendingTokens,
} from 'jupiter-library';

const client = createJupiterClient(); // free host unless JUPITER_API_KEY is set

// Prices for several mints, aligned to input order, in one batched call:
const [sol, usdc] = await getPrices(client, [SOL_MINT, USDC_MINT]);
sol?.usdPrice; // number | null

// Full token information for a single mint:
const jup = await getToken(client, JUP_MINT);
jup?.symbol;        // 'JUP'
jup?.isVerified;    // boolean | null
jup?.holderCount;   // number | null

// Curated lists:
const lsts = await getTokensByTag(client, 'lst');
const hot = await getTrendingTokens(client, 'toptrending', '24h');
```

## API

### Price (`/price/v3`)

| Function | Returns |
|----------|---------|
| `getPrice(client, mint)`        | `TokenPrice \| null` |
| `getPrices(client, mints)`      | `(TokenPrice \| null)[]` — aligned to input |
| `getPricesAsMap(client, mints)` | `Map<string, TokenPrice>` |

### Token information (`/tokens/v2/*`)

| Function | Endpoint | Returns |
|----------|----------|---------|
| `searchTokens(client, query)`            | `search`              | `TokenInfo[]` — query by mint, symbol, or name (string or array) |
| `getToken(client, mint)`                 | `search`              | `TokenInfo \| null` |
| `getTokens(client, mints)`               | `search`              | `(TokenInfo \| null)[]` — aligned to input |
| `getTokensAsMap(client, mints)`          | `search`              | `Map<string, TokenInfo>` |
| `getTokensByTag(client, tag)`            | `tag`                 | `TokenInfo[]` — `'verified'` \| `'lst'` |
| `getTrendingTokens(client, cat, intvl)`  | `{category}/{interval}` | `TokenInfo[]` — cat: `toptrending` \| `toptraded` \| `toporganicscore`; interval: `5m` \| `1h` \| `6h` \| `24h` |
| `getRecentTokens(client)`                | `recent`              | `TokenInfo[]` |

## Environment variables

| Var               | Used by               | Default |
|-------------------|-----------------------|---------|
| `JUPITER_API_KEY` | `createJupiterClient` | unset — falls back to the free `lite-api.jup.ag` host |

Get a key from the [Jupiter Portal](https://developers.jup.ag/portal).
