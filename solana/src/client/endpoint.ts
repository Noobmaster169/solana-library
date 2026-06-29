/**
 * An RPC endpoint, with optional basic-auth credentials parsed out of the URL.
 * Many providers (and the portfolio service this is modeled on) embed
 * `username:password@host` in the URL; we split that into proper headers so the
 * credentials never ride in the request line.
 */
export type RpcEndpoint = {
  url: string;
  basicAuth?: {
    username: string;
    password: string;
  };
};

/** Parse a possibly-credentialed URL into `{ url, basicAuth }`. */
export function urlToRpcEndpoint(url: string): RpcEndpoint {
  const nUrl = new URL(url);
  const isBasicAuth = Boolean(
    nUrl.username &&
      nUrl.username !== '' &&
      nUrl.password &&
      nUrl.password !== ''
  );
  const basicAuth = isBasicAuth
    ? { username: nUrl.username, password: nUrl.password }
    : undefined;

  return {
    url: `${nUrl.origin}${nUrl.pathname}${nUrl.search}`,
    basicAuth,
  };
}

/** Build the `Authorization: Basic ...` header for a username/password pair. */
export function getBasicAuthHeaders(
  username: string,
  password: string
): { Authorization: string } {
  return {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
      'base64'
    )}`,
  };
}
