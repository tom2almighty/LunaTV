export async function runWithConcurrencyLimit<T>(
  taskFactories: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  if (taskFactories.length === 0) {
    return [];
  }

  const safeLimit = Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 1);
  const results = new Array<PromiseSettledResult<T>>(taskFactories.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= taskFactories.length) {
        return;
      }

      try {
        const value = await taskFactories[current]();
        results[current] = {
          status: 'fulfilled',
          value,
        };
      } catch (reason) {
        results[current] = {
          status: 'rejected',
          reason,
        };
      }
    }
  }

  const workerCount = Math.min(safeLimit, taskFactories.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
