# flash — Flash Trade V2 (perps)

A simplicity layer for [Flash Trade V2](https://docs.flash.trade), the Solana
perpetuals protocol. Read market data and positions, quote trades, and build
open/close/order/collateral instructions — with the official
[`@flash_trade/flash-sdk-v2`](https://www.npmjs.com/package/@flash_trade/flash-sdk-v2)
used only where its oracle/pool math and account layouts are genuinely needed.

## How it's built (hybrid)

Flash settles trading on a MagicBlock **ephemeral rollup (ER)**. A wallet's
positions and orders live in one per-owner **Basket** account, delegated to the
ER; funds flow **deposit → delegate → trade → withdraw**.

| Layer          | Source                                   | SDK? | RPC |
| -------------- | ---------------------------------------- | ---- | --- |
| `markets/`     | bundled pool registry + Jupiter prices   | no   | 0 (prices via Jupiter) |
| `accounts/`    | one `getAccountInfo` on the ER, decoded  | decode only | 1 per read |
| `views/`       | ER view simulation (fees/PnL/liq)        | yes  | sim |
| `tx/`          | SDK instruction builders (unsigned)      | yes  | — |

Reads never need a wallet. Writes take a keypair and return **unsigned**
instructions — you sign and submit.

## Client

```ts
import { createFlashClient } from 'solana-defi-library/flash';

// Read-only (no wallet): market data, positions, quotes.
const flash = createFlashClient();

// Writable: pass a keypair to enable the tx builders' send helpers.
const flash = createFlashClient({ keypair, erRpc: process.env.FLASH_ER_RPC });
```

Two connections live inside: the base layer (`SOLANA_RPC`) for setup/delegation,
and the ER validator (`FLASH_ER_RPC`, default mainnet `https://flash.magicblock.xyz`)
for positions and trades.

## Reads

```ts
import {
  getAvailableMarkets, getSupportedTokenPrices,   // markets/ — no network (prices via Jupiter)
  getUserPositions,                 // accounts/ — one ER RPC
  getOpenPositionQuote,         // views/ — simulated
} from 'solana-defi-library/flash';

getAvailableMarkets();                                  // all markets, every pool + asset class
getAvailableMarkets(cluster, 'Equity.1');               // one pool only
await getUserPositions(flash, ownerAddress);       // open positions + leverage/PnL basis
await getOpenPositionQuote(flash, {
  targetSymbol: 'SOL', side: 'long', amountIn: 1, leverage: 2,
});                                             // entry, liq, size, fees
```

## Writes (builders + send)

Every builder returns `{ instructions, additionalSigners }` (unsigned). Submit
trades with `sendAndConfirmEr` (ER) and setup with `sendAndConfirmBase` (base).

```ts
import {
  buildInitializeBasket, buildInitializeUserDepositLedger, buildInitTradeVault,
  buildDeposit, buildWithdraw, buildDelegateBasket, sendAndConfirmBase,
  buildOpenPosition, buildClosePosition, sendAndConfirmEr,
} from 'solana-defi-library/flash';

// First-time setup (base layer). The deposit ledger is needed once per owner,
// and the trade vault once per collateral mint, before the first deposit.
await sendAndConfirmBase(flash, await buildInitializeBasket(flash));
await sendAndConfirmBase(flash, await buildInitializeUserDepositLedger(flash));
await sendAndConfirmBase(flash, await buildInitTradeVault(flash, usdcMint));
await sendAndConfirmBase(flash, await buildDeposit(flash, { token: 'USDC', amount: 100 }));
await sendAndConfirmBase(flash, await buildDelegateBasket(flash));

// Withdraw idle collateral back out (base layer). `feePayer` must differ from the
// owner — it pays the escrow rent and co-signs. A validator then settles the
// payout; track it with `awaitWithdrawalSettled` (a dependency-free `awaitClosed`).
await sendAndConfirmBase(
  flash,
  await buildWithdraw(flash, { token: 'USDC', amount: 100, feePayer: feePayer.publicKey }),
  { additionalSigners: [feePayer] }
);
const status = await awaitWithdrawalSettled(flash, { token: 'USDC' }); // 'settled' | 'timeout'

// Trade (ER): 100 USDC margin, 2x long → ~$200 SOL position (USDC swapped to JitoSOL)
const open = await buildOpenPosition(flash, {
  targetSymbol: 'SOL', side: 'long', collateralAmount: 100, leverage: 2, slippageBps: 100,
});
const { signature } = await sendAndConfirmEr(flash, open);
```

Also available: `buildIncreaseSize` / `buildDecreaseSize`, `buildAddCollateral`
/ `buildRemoveCollateral`, and limit/trigger orders (`buildPlaceLimitOrder`,
`buildEditLimitOrder`, `buildCancelLimitOrder`, `buildPlaceTriggerOrder`,
`buildCancelTriggerOrder`).

### One universe, many pools

Flash splits ~125 markets (62 assets) across pools by asset class — **Crypto**
(Crypto.1, Governance.1, Community.*), **US Equity** (Equity.1), and **Forex /
Metals / Commodities** (Virtual.1). Every symbol lives in exactly one pool, so
`getAvailableMarkets()` aggregates them all and tags each with `pool` + `assetClass`, and
`resolveTrade` auto-locates the pool from the symbol. Execution is identical
across classes — `getOpenPositionQuote({ targetSymbol: 'TSLA', … })` and
`{ targetSymbol: 'SOL', … }` take the same code path; only market hours differ
(equities/forex revert when their session is closed).

### Collateral is USDC by default

Positions use **USDC as the utilized capital** — the amount you pass is USDC.
Shorts hold it natively; longs **swap it into the market's lock asset** (SOL
longs lock **JitoSOL**, equity longs lock **SPY**, gold locks **XAUt**), shown as
`swapRequired: true` in the quote. So `{ targetSymbol:'SOL', side:'long',
amountIn: 100, leverage: 2 }` means *100 USDC margin, 2x* — the same across every
asset class.

The lock asset is fixed by the market (never by the funding token) and resolved
for you. To fund with the lock asset directly and **skip the swap**, pass
`collateralSymbol` (e.g. `'JitoSOL'` for a SOL long, `'SPY'` for TSLA). Never
hardcode the market account or collateral.

## Not included

Liquidity (FLP/sFLP), staking (FAF), and referrals are intentionally out of
scope for this module.
