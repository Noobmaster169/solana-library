import axios from 'axios';
import {
  Candle,
  ChartInterval,
  ChartQuote,
  ChartType,
  GetChartResponse,
} from './types';

/**
 * The charts endpoint lives on `datapi.jup.ag`, a **different host** than the
 * lite/pro hosts that `createJupiterClient` routes between. Rather than bend
 * the shared client's host-routing (which would risk breaking price/token
 * calls), this function is self-contained and talks to `datapi.jup.ag`
 * directly via its own axios call.
 */
const DATAPI_BASE_URL = 'https://datapi.jup.ag';

/** Defaults mirror the legacy `getSolanaJupiterPrice` call exactly. */
const DEFAULT_INTERVAL: ChartInterval = '1_DAY';
const DEFAULT_CANDLES = 30;
const DEFAULT_QUOTE: ChartQuote = 'usd';
const DEFAULT_TYPE: ChartType = 'price';

/** Options for {@link getChart}. All fields are optional and default to the legacy values. */
export type GetChartOptions = {
  /** Candle width. Defaults to `1_DAY`. */
  interval?: ChartInterval;
  /** Number of candles to fetch. Defaults to `30`. */
  candles?: number;
  /** Quote currency. Defaults to `usd`. */
  quote?: ChartQuote;
  /** What the candles measure (`price` or `mcap`). Defaults to `price`. */
  type?: ChartType;
  /**
   * Upper bound of the window, as a unix timestamp in **milliseconds**.
   * Defaults to "now" (`Date.now()`). Note: the legacy code passed
   * `Date.now()` (ms) straight through, so this preserves that behaviour.
   */
  to?: number;
};

/**
 * Historical OHLC candles for a mint from Jupiter's charts endpoint
 * (`GET https://datapi.jup.ag/v2/charts/{mint}`).
 *
 * Candles are returned **ascending by time** (oldest first, newest last) — this
 * matches the legacy implementation, which `.reverse()`d the API's
 * newest-first ordering. Candles with a non-positive close price are filtered
 * out, again mirroring the legacy behaviour. Timestamps are converted from the
 * API's unix *seconds* to **milliseconds**.
 *
 * Returns an empty array when the endpoint reports no candles.
 */
export async function getChart(
  mint: string,
  options: GetChartOptions = {}
): Promise<Candle[]> {
  const {
    interval = DEFAULT_INTERVAL,
    candles = DEFAULT_CANDLES,
    quote = DEFAULT_QUOTE,
    type = DEFAULT_TYPE,
    to = Date.now(),
  } = options;

  const res = await axios.get<GetChartResponse>(
    `${DATAPI_BASE_URL}/v2/charts/${mint}`,
    { params: { interval, to, candles, type, quote } }
  );

  const raw = res.data?.data?.candles ?? [];

  return raw
    .map<Candle>((candle) => ({
      // API returns unix seconds; we expose milliseconds.
      timestamp: Number(candle.time) * 1000,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: candle.volume !== undefined ? Number(candle.volume) : undefined,
    }))
    .filter((candle) => candle.close > 0)
    // API returns newest-first; reverse to ascending-by-time (oldest first).
    .reverse();
}
