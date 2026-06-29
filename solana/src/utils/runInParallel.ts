/**
 * Run async thunks with a sliding-window concurrency `limit` (default 100). A
 * new task starts as soon as any in-flight task settles, so throughput stays
 * high even when individual tasks vary in duration. `limit <= 0` runs all at
 * once. Results are returned in input order.
 */
export async function runInParallel<T>(
  functionsToRun: (() => Promise<T>)[],
  limit = 100
): Promise<PromiseSettledResult<T>[]> {
  const results: Promise<PromiseSettledResult<T>>[] = [];
  const executing: Promise<void>[] = [];

  for (const func of functionsToRun) {
    const p = func().then(
      (value) => ({ status: 'fulfilled', value } as const),
      (reason) => ({ status: 'rejected', reason } as const)
    );
    results.push(p);

    const e = p.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });
    executing.push(e);

    if (limit > 0 && executing.length >= limit) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return Promise.all(results);
}
