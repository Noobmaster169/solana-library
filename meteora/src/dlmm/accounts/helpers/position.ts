import BigNumber from 'bignumber.js';
import { PublicKey } from '@solana/web3.js';
import { MAX_BIN_ARRAY_SIZE, SCALE_OFFSET } from '../../constants';
import {
  Rounding,
  getPriceOfBinByBinId,
  mulShr,
  shiftRight64,
  toInt,
} from './math';
import { binIdToBinArrayIndex, getBinArrayLowerUpperBinId } from './derive';
import { Bin, BinArray, DlmmPosition, LbPair } from '../layouts';

// ---------------------------------------------------------------------------
// Position valuation: from a decoded position + its two bin arrays + the pool,
// compute the underlying token amounts and the claimable swap fees / LM
// rewards. Ported from Sonarwatch's dlmmHelper.processPosition, kept faithful
// to its semantics (including the V1/V2 share-scaling branches) but rewritten
// in bignumber.js.
// ---------------------------------------------------------------------------

export type BinLiquidity = {
  binId: number;
  xAmount: BigNumber;
  yAmount: BigNumber;
  supply: BigNumber;
  version: number;
  price: string;
  pricePerToken: string;
};

export type PositionBinData = {
  binId: number;
  price: string;
  pricePerToken: string;
  binXAmount: string;
  binYAmount: string;
  binLiquidity: string;
  positionLiquidity: string;
  positionXAmount: string;
  positionYAmount: string;
};

export type PositionData = {
  totalXAmount: BigNumber;
  totalYAmount: BigNumber;
  positionBinData: PositionBinData[];
  lowerBinId: number;
  upperBinId: number;
  feeX: BigNumber;
  feeY: BigNumber;
  rewardOne: BigNumber;
  rewardTwo: BigNumber;
};

/** The bin holding `binId` within a (lower or upper) bin array. */
export function getBinFromBinArray(binId: number, binArray: BinArray): Bin {
  const [lowerBinId, upperBinId] = getBinArrayLowerUpperBinId(
    binArray.index.toNumber()
  );
  let index: number;
  if (binId > 0) {
    index = binId - lowerBinId;
  } else {
    const delta = upperBinId - binId;
    index = MAX_BIN_ARRAY_SIZE - delta - 1;
  }
  return binArray.bins[index];
}

/** The bins covered by a position, with per-bin price, in ascending id order. */
export function getBinsBetweenLowerAndUpperBound(
  lbPair: LbPair,
  lowerBinId: number,
  upperBinId: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number,
  lowerBinArray: BinArray,
  upperBinArray: BinArray
): BinLiquidity[] {
  const lowerBinArrayIndex = binIdToBinArrayIndex(lowerBinId);
  const upperBinArrayIndex = binIdToBinArrayIndex(upperBinId);

  const bins: BinLiquidity[] = [];
  const arrays =
    lowerBinArrayIndex === upperBinArrayIndex
      ? [lowerBinArray]
      : [lowerBinArray, upperBinArray];

  arrays.forEach((binArray) => {
    const [lowerBinIdForArray] = getBinArrayLowerUpperBinId(
      binArray.index.toNumber()
    );
    binArray.bins.forEach((bin, idx) => {
      const binId = lowerBinIdForArray + idx;
      if (binId >= lowerBinId && binId <= upperBinId) {
        const pricePerLamport = getPriceOfBinByBinId(lbPair.binStep, binId);
        bins.push({
          binId,
          xAmount: bin.amountX,
          yAmount: bin.amountY,
          supply: bin.liquiditySupply,
          version: binArray.version,
          price: pricePerLamport,
          pricePerToken: new BigNumber(pricePerLamport)
            .times(new BigNumber(10).pow(baseTokenDecimal - quoteTokenDecimal))
            .toString(),
        });
      }
    });
  });

  return bins;
}

export type SwapFee = { feeX: BigNumber; feeY: BigNumber };

/** Claimable (unclaimed) swap fees in token X and Y, in raw units. */
export function getClaimableSwapFee(
  position: DlmmPosition,
  lowerBinArray: BinArray,
  upperBinArray: BinArray
): SwapFee {
  const lowerBinArrayIdx = binIdToBinArrayIndex(position.lowerBinId);
  let feeX = new BigNumber(0);
  let feeY = new BigNumber(0);

  for (let i = position.lowerBinId; i <= position.upperBinId; i += 1) {
    const binArray = binIdToBinArrayIndex(i) === lowerBinArrayIdx
      ? lowerBinArray
      : upperBinArray;
    const binState = getBinFromBinArray(i, binArray);
    const feeInfos = position.feeInfos[i - position.lowerBinId];

    const rawShare = position.liquidityShares[i - position.lowerBinId];
    const liquidityShare =
      position.version === 'V1' ? rawShare : shiftRight64(rawShare);
    if (liquidityShare.isZero()) continue;

    const feeXPerToken = binState.feeAmountXPerTokenStored.minus(
      feeInfos.feeXPerTokenComplete
    );
    if (!feeXPerToken.isZero()) {
      const newFeeX = mulShr(liquidityShare, feeXPerToken, SCALE_OFFSET, Rounding.Down);
      feeX = feeX.plus(newFeeX).plus(feeInfos.feeXPending);
    }

    const feeYPerToken = binState.feeAmountYPerTokenStored.minus(
      feeInfos.feeYPerTokenComplete
    );
    if (!feeYPerToken.isZero()) {
      const newFeeY = mulShr(liquidityShare, feeYPerToken, SCALE_OFFSET, Rounding.Down);
      feeY = feeY.plus(newFeeY).plus(feeInfos.feeYPending);
    }
  }

  return { feeX, feeY };
}

export type LMRewards = { rewardOne: BigNumber; rewardTwo: BigNumber };

/** Claimable liquidity-mining rewards (up to two), in raw units. */
export function getClaimableLMReward(
  lbPair: LbPair,
  onChainTimestamp: number,
  position: DlmmPosition,
  lowerBinArray: BinArray,
  upperBinArray: BinArray
): LMRewards {
  const lowerBinArrayIdx = binIdToBinArrayIndex(position.lowerBinId);
  const rewards = [new BigNumber(0), new BigNumber(0)];

  for (let i = position.lowerBinId; i <= position.upperBinId; i += 1) {
    const binArray = binIdToBinArrayIndex(i) === lowerBinArrayIdx
      ? lowerBinArray
      : upperBinArray;
    const binState = getBinFromBinArray(i, binArray);
    const positionRewardInfo = position.rewardInfos[i - position.lowerBinId];

    const rawShare = position.liquidityShares[i - position.lowerBinId];
    const liquidityShare =
      position.version === 'V1' ? rawShare : shiftRight64(rawShare);

    for (let j = 0; j < 2; j += 1) {
      const pairRewardInfo = lbPair.rewardInfos[j];
      if (pairRewardInfo.mint.equals(PublicKey.default)) continue;

      let rewardPerTokenStored =
        j === 0 ? binState.rewardPerTokenXStored : binState.rewardPerTokenYStored;

      if (i === lbPair.activeId && !binState.liquiditySupply.isZero()) {
        const currentTime = new BigNumber(
          Math.min(onChainTimestamp, pairRewardInfo.rewardDurationEnd.toNumber())
        );
        const delta = currentTime.minus(pairRewardInfo.lastUpdateTime);
        const liquiditySupply =
          binArray.version === 0
            ? binState.liquiditySupply
            : binState.liquiditySupply.shiftedBy(SCALE_OFFSET);
        const rewardPerTokenStoredDelta = pairRewardInfo.rewardRate
          .times(delta)
          .div(15)
          .div(liquiditySupply);
        rewardPerTokenStored = rewardPerTokenStored.plus(rewardPerTokenStoredDelta);
      }

      const delta = rewardPerTokenStored.minus(
        j === 0
          ? positionRewardInfo.rewardPerTokenCompletesX
          : positionRewardInfo.rewardPerTokenCompletesY
      );
      const newReward = mulShr(toInt(delta), liquidityShare, SCALE_OFFSET, Rounding.Down);
      rewards[j] = rewards[j]
        .plus(newReward)
        .plus(
          j === 0
            ? positionRewardInfo.rewardPendingsX
            : positionRewardInfo.rewardPendingsY
        );
    }
  }

  return { rewardOne: rewards[0], rewardTwo: rewards[1] };
}

/**
 * Full valuation of a position: underlying token amounts plus claimable swap
 * fees and LM rewards. Returns `null` if the position covers no bins.
 */
export function processPosition(
  lbPair: LbPair,
  position: DlmmPosition,
  baseTokenDecimal: number,
  quoteTokenDecimal: number,
  lowerBinArray: BinArray,
  upperBinArray: BinArray
): PositionData | null {
  const { lowerBinId, upperBinId, liquidityShares: posShares, version } = position;

  const bins = getBinsBetweenLowerAndUpperBound(
    lbPair,
    lowerBinId,
    upperBinId,
    baseTokenDecimal,
    quoteTokenDecimal,
    lowerBinArray,
    upperBinArray
  );
  if (!bins.length) return null;

  const positionBinData: PositionBinData[] = [];
  let totalXAmount = new BigNumber(0);
  let totalYAmount = new BigNumber(0);

  bins.forEach((bin, idx) => {
    const binSupply = bin.supply;
    const posShare =
      bin.version === 1 && version === 'V1'
        ? posShares[idx].shiftedBy(-SCALE_OFFSET)
        : posShares[idx];

    const positionXAmount = binSupply.isZero()
      ? new BigNumber(0)
      : posShare.times(bin.xAmount).div(binSupply).integerValue(BigNumber.ROUND_FLOOR);
    const positionYAmount = binSupply.isZero()
      ? new BigNumber(0)
      : posShare.times(bin.yAmount).div(binSupply).integerValue(BigNumber.ROUND_FLOOR);

    totalXAmount = totalXAmount.plus(positionXAmount);
    totalYAmount = totalYAmount.plus(positionYAmount);

    positionBinData.push({
      binId: bin.binId,
      price: bin.price,
      pricePerToken: bin.pricePerToken,
      binXAmount: bin.xAmount.toString(),
      binYAmount: bin.yAmount.toString(),
      binLiquidity: binSupply.toString(),
      positionLiquidity: posShare.toString(),
      positionXAmount: positionXAmount.toString(),
      positionYAmount: positionYAmount.toString(),
    });
  });

  const { feeX, feeY } = getClaimableSwapFee(position, lowerBinArray, upperBinArray);
  const { rewardOne, rewardTwo } = getClaimableLMReward(
    lbPair,
    Date.now(),
    position,
    lowerBinArray,
    upperBinArray
  );

  return {
    totalXAmount,
    totalYAmount,
    positionBinData,
    lowerBinId,
    upperBinId,
    feeX,
    feeY,
    rewardOne,
    rewardTwo,
  };
}
