/**
 * Runs `task` for every item with at most `workers` running at the same time — several uploads
 * at once use a long, lossy connection much better than one. The first failure stops the pool.
 */
export async function runPool<T>(
  items: readonly T[],
  workers: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  let failed = false;
  let failure: unknown = null;
  const worker = async () => {
    while (!failed && next < items.length) {
      const item = items[next++] as T;
      try {
        await task(item);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, worker));
  if (failed) throw failure;
}
