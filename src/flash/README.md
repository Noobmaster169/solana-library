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
  getMarkets, getTokenPrices,   // markets/ — no network (prices via Jupiter)
  getPositions,                 // accounts/ — one ER RPC
  getOpenPositionQuote,         // views/ — simulated
} from 'solana-defi-library/flash';

getMarkets();                                  // 27 markets, normalized
await getPositions(flash, ownerAddress);       // open positions + leverage/PnL basis
await getOpenPositionQuote(flash, {
  targetSymbol: 'SOL', side: 'long', amountIn: 1, leverage: 2,
});                                             // entry, liq, size, fees
```

## Writes (builders + send)

Every builder returns `{ instructions, additionalSigners }` (unsigned). Submit
trades with `sendAndConfirmEr` (ER) and setup with `sendAndConfirmBase` (base).

```ts
import {
  buildInitializeBasket, buildDeposit, buildDelegateBasket, sendAndConfirmBase,
  buildOpenPosition, buildClosePosition, sendAndConfirmEr,
} from 'solana-defi-library/flash';

// First-time setup (base layer):
await sendAndConfirmBase(flash, await buildInitializeBasket(flash));
await sendAndConfirmBase(flash, await buildDeposit(flash, { token: 'SOL', amount: 1 }));
await sendAndConfirmBase(flash, await buildDelegateBasket(flash));

// Trade (ER):
const open = await buildOpenPosition(flash, {
  targetSymbol: 'SOL', side: 'long', collateralAmount: 1, leverage: 2, slippageBps: 100,
});
const { signature } = await sendAndConfirmEr(flash, open);
```

Also available: `buildIncreaseSize` / `buildDecreaseSize`,
`buildAddCollateral` / `buildRemoveCollateral`, and limit/trigger orders
(`buildPlaceLimitOrder`, `buildEditLimitOrder`, `buildCancelLimitOrder`,
`buildPlaceTriggerOrder`, `buildCancelTriggerOrder`).

### The lock-custody detail

A market's collateral (lock) custody can differ from what you fund with — SOL
longs lock **JitoSOL**, so funding with SOL triggers a swap (`swapRequired: true`
in the quote). `resolveTrade` handles this: you pass the target + side (+ optional
funding `collateralSymbol`), and the right market/lock are resolved for you.
Never hardcode the market account or collateral.

## Not included

Liquidity (FLP/sFLP), staking (FAF), and referrals are intentionally out of
scope for this module.
