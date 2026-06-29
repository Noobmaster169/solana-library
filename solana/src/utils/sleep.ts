/** Resolve after `ms` milliseconds. */
export function sleep(ms = 100): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
