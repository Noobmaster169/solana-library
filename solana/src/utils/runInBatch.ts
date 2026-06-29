/**
 * Run async thunks in sequential batches of `batchSize`, settling each batch
 * before starting the next. Use when you want to cap how many requests hit a
 * backend at once and don't need a sliding window.
 */
export async function runInBatch<T>(
  functionsToRun: (() => Promise<T>)[],
  batchSize = 100
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const queue = [...functionsToRun];

  while (queue.length !== 0) {
    const batch = queue.splice(0, batchSize);
    // eslint-disable-next-line no-await-in-loop
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);
  }

  return results;
}
