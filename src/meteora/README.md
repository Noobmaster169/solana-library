# meteora-library

A simplicity layer for reading **Meteora DLMM** (Liquidity Book) on-chain data.

Decode positions, pools, and bins, and compute the underlying token amounts,
claimable swap fees, and liquidity-mining rewards — using hand-written
`BufferReader` layouts on top of [`solana-library`](../solana). Read-only, raw
amounts by default, with **opt-in** Jupiter USD valuation. No transaction
building, no heavy abstractions.

It mirrors the well-engineered fetching approach the Sonarwatch portfolio
service uses for DLMM, rewritten to this library's conventions (plain typed
objects instead of beet structs and portfolio elements).

## Structure

The package is organized by **interaction type**, so future API and transaction
support slots in cleanly alongside the current read layer:

```
src/dlmm/
  constants.ts          shared protocol constants (program id, scale)
  accounts/             reading on-chain data & positions   ← available now
    getPositions.ts       getDlmmPositionsByOwner   ◀ core
    getPools.ts           getLbPair / getLbPairs / getAllLbPairs   ◀ core
    getActiveBin.ts       getActiveBin / getActiveBinPrice   ◀ core
    pricing.ts            attachUsdValues (optional Jupiter valuation)
    layouts.ts            account decoders + types + sizes
    helpers/              PDAs, fixed-point math, valuation internals
  api/                  Meteora HTTP API integrations        — coming soon
  tx/                   transaction builders                 — coming soon
```

**Core functions** (the everyday API) live at the top of `accounts/`. Lower-level
**helpers** (PDA derivation, math, valuation internals) are grouped under
`accounts/helpers/` and exposed via a `helpers` namespace so they stay out of the
way until you need them.

## Install

```bash
npm install
```

This links the sibling `solana-library` and `jupiter-library` packages via
`file:` dependencies.

## Usage

```ts
import { createConnection } from 'solana-library';
import {
  getDlmmPositionsByOwner,
  getLbPair,
  getActiveBin,
} from 'meteora-library';

const connection = createConnection(); // reads SOLANA_RPC

// A wallet's DLMM positions, valued (raw amounts + fees + rewards).
const positions = await getDlmmPositionsByOwner(connection, OWNER_ADDRESS);

// Pool state and spot price.
const pool = await getLbPair(connection, POOL_ADDRESS);
const active = await getActiveBin(connection, POOL_ADDRESS);
console.log(active?.pricePerToken);
```

### Optional USD valuation

```ts
import { createJupiterClient } from 'jupiter-library';
import { attachUsdValues } from 'meteora-library';

const valued = await attachUsdValues(createJupiterClient(), positions);
const total = valued.reduce((s, p) => s + p.totalValue, 0);
```

## API

### Core functions (what most developers use)

- **Positions** — `getDlmmPositionsByOwner(connection, owner)` → `DlmmPositionResult[]`
  (V1 + V2; per-position underlying amounts, claimable fees, LM rewards, out-of-range flag).
- **Pools** — `getLbPair`, `getLbPairs`, `getAllLbPairs`.
- **Active bin & price** — `getActiveBin`, `getActiveBinPrice`.
- **Valuation** — `attachUsdValues` (optional, Jupiter).

### Account decoders

`parseLbPair`, `parsePositionV1`, `parsePositionV2`, `parseBinArray` (+ layout
types and `*_SIZE` constants).

### Helpers (advanced — `helpers` namespace)

```ts
import { helpers } from 'meteora-library';
helpers.deriveBinArray(pool, index);
helpers.getPriceOfBinByBinId(binStep, binId);
helpers.processPosition(/* ... */);
```

PDA derivation (`deriveBinArray`, `deriveReserve`, `deriveOracle`,
`binIdToBinArrayIndex`), fixed-point math (`mulShr`, `mulDiv`, `shiftRight64`,
`getPriceOfBinByBinId`), and valuation internals (`processPosition`,
`getClaimableSwapFee`, `getClaimableLMReward`).

Everything is also reachable through namespaces: `dlmm.accounts.*` and
`dlmm.accounts.helpers.*`.

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npm run smoke       # live read against mainnet (set SOLANA_RPC; METEORA_OWNER optional)
```
