import { describe, expect, it } from 'vitest';

import { createAbortableSearchController } from '@/lib/search/abortable-search';

describe('abortable search', () => {
  it('aborts downstream calls when stream is cancelled', async () => {
    const controller = createAbortableSearchController();
    let aborted = false;

    const downstreamCall = new Promise<void>((_, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });

    controller.abort('client cancelled');

    await expect(downstreamCall).rejects.toThrow('Aborted');
    expect(aborted).toBe(true);
  });
});
