# solana-library

A **simplicity layer for querying Solana**. It distills one principle that most
SDKs bury under abstraction:

> Fetch raw account bytes → parse them with fixed beet layouts → batch RPC
> queries aggressively.

That's the whole job. There is **no** retry/failover/rate-limiting layer (RPC
resilience is your provider's concern), no persistent cache machinery, no
codegen. Just clean, composable functions for reading on-chain data.

The patterns here are extracted from the SonarWatch/Jupiter portfolio service,
which reads account data about as efficiently as anything in the ecosystem.

## Install

This is a **drop-in source folder** — copy `src/` into your project, or import
it directly. It targets `@solana/web3.js` **v1**.

```bash
npm install @solana/web3.js@^1.98 bignumber.js axios
```

Three runtime dependencies, that's it. Binary parsing is a ~120-line
`BufferReader` cursor — no codec framework, no external parsing library.

Then `npm install` here to typecheck the library itself:

```bash
npm install
npm run typecheck     # tsc --noEmit
npm run smoke         # optional live read against public mainnet RPC
```

## Conventions (what makes it a "simplicity layer")

- **`PublicKey | string` everywhere.** Every public function normalizes input,
  so you never sprinkle `new PublicKey(...)` at call sites.
- **Positionally aligned results.** Batch reads return an array the same length
  and order as the input (`result[i]` ↔ `input[i]`), or a `Map` keyed by
  address. Never reshuffled.
- **`BigNumber` for on-chain integers.** Wide ints (`u64`/`u128`/`i64`/…)
  exceed JS's safe-integer range, so `BufferReader` decodes them to `BigNumber`
  and they round-trip exactly. Small ints come back as plain numbers.
- **Invisible chunking.** The 100-key `getMultipleAccounts` cap and the 1000-id
  DAS cap are handled internally.

## Quick start

```ts
import {
  createConnection,
  getParsedAccounts,
  getProgramAccounts,
  getTokenBalances,
  getDecimals,
  dataSizeFilter,
  memcmpFilter,
} from 'solana-library';

const connection = createConnection(); // env SOLANA_RPC, else public mainnet

// Balances for specific mints (both Token + Token-2022), one batched read:
const balances = await getTokenBalances(connection, owner, [usdcMint, bonkMint]);
balances.get(usdcMint)?.amount; // BigNumber, raw amount

// Decimals, aligned to input:
const [usdcDec, bonkDec] = await getDecimals(connection, [usdcMint, bonkMint]);

// Parse arbitrary accounts with your own parser (see below):
const parsed = await getParsedAccounts(connection, parseMyAccount, [a, b, c]);

// getProgramAccounts with filters + a safety cap:
const accounts = await getProgramAccounts(connection, programId, {
  filters: [dataSizeFilter(165), memcmpFilter(32, owner)],
  maxAccounts: 5000, // throws (cheaply) before downloading more than this
});
```

### Defining a struct

A "struct" is just a function that walks the buffer top-to-bottom with a
`BufferReader`. No schema, no codegen — read the fields in layout order:

```ts
import { BufferReader, Parser } from 'solana-library';

type MyAccount = { authority: PublicKey; amount: BigNumber; bump: number };

const parseMyAccount: Parser<MyAccount> = (data) => {
  const r = new BufferReader(data);
  r.skip(8); // anchor discriminator
  return {
    authority: r.publicKey(),
    amount: r.u64(),
    bump: r.u8(),
  };
};
```

## Modules

| Module       | What's in it |
|--------------|--------------|
| `client/`    | `createConnection` (basic-auth + optional request logging), endpoint parsing |
| `parse/`     | `BufferReader` (the cursor), `ParsedAccount`, `Parser`, `parseMintAccount`, `parseTokenAccount`, `anchorSighash` |
| `accounts/`  | `getMultipleAccounts`, `getParsedAccount(s)`, `getProgramAccounts` (two-phase count-then-fetch), `getParsedProgramAccounts`, filter builders |
| `tokens/`    | `getTokenBalances`, `getDecimals(AsMap)`, `getSupply`, `getAssociatedTokenAddress`, program-id constants |
| `das/`       | `getAssetBatch(AsMap)`, `getAssetsByOwner` (paginated), Helius types |
| `utils/`     | `sleep`, `promiseTimeout`, `runInBatch`, `runInParallel`, `createTtlCache` |

## Environment variables

| Var                     | Used by            | Default |
|-------------------------|--------------------|---------|
| `SOLANA_RPC`            | `createConnection` | public mainnet-beta |
| `SOLANA_RPC_LOGS`       | `createConnection` | off — set `true` to log RPC method counts |
| `SOLANA_DAS_ENDPOINT`   | `getDasEndpoint`   | public mainnet-beta (which has no DAS — set a Helius-compatible URL) |

Basic-auth credentials embedded in any RPC/DAS URL (`https://user:pass@host`)
are automatically moved into request headers.
