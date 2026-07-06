import BigNumber from 'bignumber.js';
import {
  type JupiterClient,
  type TokenPrice,
  getPricesAsMap,
} from '@jupiter';
import { type DlmmPositionResult } from './getPositions';

// ---------------------------------------------------------------------------
// Opt-in USD valuation. Keeps the core dependency-light: positions carry raw
// amounts, and this helper layers Jupiter prices on top when you want them.
// ---------------------------------------------------------------------------

export type DlmmPositionValued = DlmmPositionResult & {
  /** USD value of the underlying X + Y liquidity. */
  liquidityValue: number;
  /** USD value of claimable swap fees. */
  feeValue: number;
  /** USD value of claimable LM rewards. */
  rewardValue: number;
  /** liquidityValue + feeValue + rewardValue. */
  totalValue: number;
};

function usdValue(
  amount: BigNumber,
  decimals: number,
  price: TokenPrice | undefined
): number {
  if (!price || amount.isZero()) return 0;
  return amount
    .dividedBy(new BigNumber(10).pow(decimals))
    .times(price.usdPrice)
    .toNumber();
}

/**
 * Attach USD values to positions using Jupiter prices. Reward token decimals
 * come from the Jupiter price entry (positions don't carry them); unpriced
 * tokens contribute 0.
 */
export async function attachUsdValues(
  client: JupiterClient,
  positions: DlmmPositionResult[]
): Promise<DlmmPositionValued[]> {
  const mints = new Set<string>();
  for (const p of positions) {
    mints.add(p.tokenXMint.toBase58());
    mints.add(p.tokenYMint.toBase58());
    for (const m of p.rewardMints) if (m) mints.add(m.toBase58());
  }

  const priceByMint = await getPricesAsMap(client, [...mints]);

  return positions.map((p) => {
    const priceX = priceByMint.get(p.tokenXMint.toBase58());
    const priceY = priceByMint.get(p.tokenYMint.toBase58());

    const liquidityValue =
      usdValue(p.totalXAmount, p.decimalsX, priceX) +
      usdValue(p.totalYAmount, p.decimalsY, priceY);
    const feeValue =
      usdValue(p.feeX, p.decimalsX, priceX) +
      usdValue(p.feeY, p.decimalsY, priceY);

    let rewardValue = 0;
    const rewardAmounts = [p.rewardOne, p.rewardTwo];
    p.rewardMints.forEach((mint, i) => {
      if (!mint) return;
      const price = priceByMint.get(mint.toBase58());
      if (!price) return;
      rewardValue += usdValue(rewardAmounts[i], price.decimals, price);
    });

    return {
      ...p,
      liquidityValue,
      feeValue,
      rewardValue,
      totalValue: liquidityValue + feeValue + rewardValue,
    };
  });
}
