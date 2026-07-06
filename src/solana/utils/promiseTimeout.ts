/**
 * Reject if `promise` does not settle within `ms`. Note the underlying work is
 * not cancelled — this only stops you waiting on it.
 */
export function promiseTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(message ?? `Promise timed out: ${ms}ms.`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() =>
    clearTimeout(timer)
  ) as Promise<T>;
}
