import axios, { AxiosInstance } from 'axios';

/** Free tier — no API key required. Ideal for examples and light usage. */
const LITE_BASE_URL = 'https://lite-api.jup.ag';
/** Pro tier — requires an `x-api-key` header (get one from the Jupiter Portal). */
const PRO_BASE_URL = 'https://api.jup.ag';

export type JupiterClientOptions = {
  /**
   * Jupiter Portal API key. Defaults to `process.env.JUPITER_API_KEY`. When
   * present, requests go to the Pro host (`api.jup.ag`) with an `x-api-key`
   * header; when absent, the free host (`lite-api.jup.ag`) is used instead.
   */
  apiKey?: string;
  /** Override the base URL entirely (e.g. a proxy). Wins over `apiKey` routing. */
  baseUrl?: string;
};

/**
 * A tiny typed `GET` wrapper around Jupiter's REST APIs.
 *
 * Deliberately thin: it picks the right host (free vs. Pro), attaches the API
 * key header when you have one, and serializes query params. There is no
 * retry/rate-limiting layer here — by design. Jupiter's price and token APIs
 * are plain HTTP GETs, so that's all this needs to be.
 */
export type JupiterClient = {
  readonly baseUrl: string;
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
};

export function createJupiterClient(
  options: JupiterClientOptions = {}
): JupiterClient {
  const apiKey = options.apiKey ?? process.env['JUPITER_API_KEY'];
  const baseUrl =
    options.baseUrl ?? (apiKey ? PRO_BASE_URL : LITE_BASE_URL);

  const http: AxiosInstance = axios.create({
    baseURL: baseUrl,
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  });

  return {
    baseUrl,
    async get<T>(
      path: string,
      params?: Record<string, string | number | undefined>
    ): Promise<T> {
      const res = await http.get<T>(path, { params });
      return res.data;
    },
  };
}
