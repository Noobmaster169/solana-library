# solana-defi-library

One combined **simplicity layer** for reading Solana protocols. Three modules
that were previously separate packages, now a single install with one clean,
per-module structure — plus a **script harness** to exercise any feature against
a live RPC.

```
src/
  solana/    core query layer  — accounts, parsing, tokens, DAS      (base)
  jupiter/   Jupiter API reads — price, tokens, charts               (base)
  meteora/   Meteora DLMM      — positions, pools, bins   (built on the two above)
  index.ts   namespaced barrel
scripts/     runnable feature scripts (the test harness)
```

Each module keeps its own deep docs: [`src/solana`](src/solana/README.md) ·
[`src/jupiter`](src/jupiter/README.md) · [`src/meteora`](src/meteora/README.md).

The philosophy is unchanged: **no** retry/rate-limiting layer, no caching, no
codegen — just clean, composable, copy-pasteable functions over `@solana/web3.js`
v1. It stays a source library (`tsx`/`noEmit`, no build step).

## Install

```bash
npm install
npm run typecheck     # tsc --noEmit across src/ and scripts/
```

## Usage

Import the whole toolkit as namespaces, or a single module directly:

```ts
import { solana, jupiter, meteora } from 'solana-defi-library';

const conn = solana.createConnection();
const pool = await meteora.getLbPair(conn, '5rCf1DM8Lj…');

// or just one module:
import { getLbPair } from 'solana-defi-library/meteora';
```

## Script harness

Drop credentials in `.env`, then run any feature by name, passing parameters
positionally. Reads need no secret; write scripts lazily load a wallet from the
keypair file at `KEYPAIR_PATH`.

```bash
cp .env.example .env          # set SOLANA_RPC; KEYPAIR_PATH only for writes

npm run script                        # list every script with its parameters
npm run script <module>/<feature> [params...]
npm run script <module>/<feature> -- --help   # show one script's parameters
npm run smoke                         # run every read script as one pass
```

Parameters are **positional** and pass straight through — e.g.
`npm run script solana/balances <owner> <mint>`. The one exception is `--help`:
npm swallows a bare `--help`, so use `-- --help` (or `-- -h`) to reach the script.

### Features & parameters

Every parameter is optional unless marked required (`<...>`); `[...]` is
optional and `...` is variadic. Omitted optional params fall back to the default
shown.

#### `solana/*` — core Solana reads

| Script | Parameters | Description |
|---|---|---|
| `solana/decimals` | `[mint...]` | Batched mint-decimals read. Default: USDC + wrapped SOL. |
| `solana/balances` | `[owner] [mint...]` | A wallet's balances for specific mints, in one batched read. Defaults: a Circle USDC account; USDC + wrapped SOL. |

```bash
npm run script solana/decimals EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
npm run script solana/balances <yourWallet> <mintA> <mintB>
```

#### `jupiter/*` — Jupiter API reads

| Script | Parameters | Description |
|---|---|---|
| `jupiter/price` | `[token...]` | USD prices, aligned to input order. Accepts symbols (`SOL`/`USDC`/`JUP`) or raw mint addresses. Default: `SOL USDC JUP`. |
| `jupiter/trending` | `[interval]` | Top trending tokens over `5m` \| `1h` \| `6h` \| `24h`. Default: `24h`. |

```bash
npm run script jupiter/price SOL USDC JUP
npm run script jupiter/trending 1h
```

#### `meteora/*` — Meteora DLMM

| Script | Parameters | Description |
|---|---|---|
| `meteora/active-bin` | `[lbPair]` | Decode a DLMM pool + its active bin/price. Default: a SOL/USDC pool. |
| `meteora/positions` | `<owner>` | **Required owner.** Lists a wallet's DLMM positions and a USD total (via Jupiter). |
| `meteora/open-position` | `[lbPair]` | **Write, not yet implemented** (see below). Default pool: a SOL/USDC pool. |

```bash
npm run script meteora/active-bin 5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6
npm run script meteora/positions <yourWallet>
```

### Anatomy of a script

Each feature lives in `scripts/<module>/<feature>.ts` and exports:

```ts
export const meta = {
  summary: string,
  params?: { name: string; desc: string }[],  // powers the list + --help
};
export default async function run(ctx: Context, args: string[]): Promise<void>;
```

The shared `ctx` (`scripts/lib/context.ts`) provides `connection`, `jupiter`,
and a lazy `wallet()`. Adding a feature is just a new file with these two exports
— the dispatcher discovers it automatically.

### Writes (coming next)

`scripts/meteora/open-position.ts` is a **write-script template**. The wallet
wiring is ready — it signs from the keypair at `KEYPAIR_PATH` — but the Meteora
DLMM `tx/` layer that builds the add-liquidity instruction is a follow-up.
Running it today fails fast with a clear "not implemented" message; it marks
exactly where the first real write feature slots in.
