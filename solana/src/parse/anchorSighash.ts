import { createHash } from 'crypto';

function snakeCase(input: string): string {
  return input
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join('_');
}

/**
 * Compute an Anchor 8-byte discriminator: the first 8 bytes of
 * `sha256("<namespace>:<snake_case_name>")`.
 *
 * Use it to build `memcmpFilter(0, disc)` for `getProgramAccounts`, or to match
 * an account/instruction discriminator. `namespace` is `"account"` for account
 * discriminators and `"global"` for instructions.
 */
export function anchorSighash(nameSpace: string, name: string): Buffer {
  const preimage = `${nameSpace}:${snakeCase(name)}`;
  return createHash('sha256').update(preimage).digest().subarray(0, 8);
}
