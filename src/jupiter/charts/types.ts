/**
 * Supported chart intervals for `GET /v2/charts`.
 *
 * The legacy implementation only ever requested `1_DAY`; the other values
 * follow Jupiter's `<n>_<UNIT>` convention and are the commonly-available
 * candle widths. Keep this conservative — only add an interval once it has
 * been confirmed against the live endpoint.
 */
export type ChartInterval =
  | '1_MINUTE'
  | '5_MINUTE'
  | '15_MINUTE'
  | '30_MINUTE'
  | '1_HOUR'
  | '4_HOUR'
  | '1_DAY'
  | '1_WEEK';

/** What each candle measures. The legacy call only used `price`. */
export type ChartType = 'price' | 'mcap';

/** The quote currency candles are denominated in. */
export type ChartQuote = 'usd';

/**
 * A single OHLC candle.
 *
 * Note: `timestamp` is in **milliseconds** (the API returns unix *seconds* —
 * {@link getChart} converts it). `volume` is optional because the exact field
 * is not relied upon by the legacy implementation and may be absent.
 */
export type Candle = {
  /** Candle open time, in **milliseconds** since the unix epoch. */
  timestamp: number;
  /** Opening price. */
  open: number;
  /** Highest price in the interval. */
  high: number;
  /** Lowest price in the interval. */
  low: number;
  /** Closing price. */
  close: number;
  /** Traded volume over the interval, if reported by the API. */
  volume?: number;
};

/** A single candle exactly as returned by `GET /v2/charts` (unix *seconds*). */
export type RawCandle = {
  /** Candle open time, in unix **seconds** (may be a number or numeric string). */
  time: number | string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  /** Volume field, when present. */
  volume?: number | string;
};

/** Raw `GET /v2/charts/{mint}` response: candles nested under `data`. */
export type GetChartResponse = {
  data?: {
    candles?: RawCandle[];
  };
};
