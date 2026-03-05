import { describe, expect, it } from 'vitest';

import { runWithConcurrencyLimit } from '../source-search-scheduler';

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('runWithConcurrencyLimit', () => {
  it('limits concurrent task execution', async () => {
    let running = 0;
    let maxRunning = 0;

    const tasks = Array.from({ length: 8 }, (_, index) => async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await sleep(10 + (index % 3));
      running -= 1;
      return index;
    });

    const settled = await runWithConcurrencyLimit(tasks, 2);
    const fulfilled = settled.filter(
      (item) => item.status === 'fulfilled',
    ) as PromiseFulfilledResult<number>[];

    expect(settled).toHaveLength(8);
    expect(fulfilled).toHaveLength(8);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('keeps processing when part of tasks fail', async () => {
    const tasks = [
      async () => 'ok-1',
      async () => {
        throw new Error('boom');
      },
      async () => 'ok-2',
    ];

    const settled = await runWithConcurrencyLimit(tasks, 2);
    expect(settled).toHaveLength(3);
    expect(settled[0].status).toBe('fulfilled');
    expect(settled[1].status).toBe('rejected');
    expect(settled[2].status).toBe('fulfilled');
  });
});
