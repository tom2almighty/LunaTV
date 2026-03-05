import { describe, expect, it } from 'vitest';

import { createSourceHealthManager } from '../source-health';

describe('source health manager', () => {
  it('opens circuit after consecutive failures and recovers after cooldown', () => {
    const manager = createSourceHealthManager({
      failureThreshold: 2,
      cooldownMs: 100,
    });
    const source = 'site-a';
    const base = 10_000;

    expect(manager.shouldAllowRequest(source, base)).toBe(true);
    manager.markFailure(source, base + 1);
    expect(manager.getState(source)?.status).toBe('closed');
    expect(manager.shouldAllowRequest(source, base + 2)).toBe(true);

    manager.markFailure(source, base + 3);
    expect(manager.getState(source)?.status).toBe('open');
    expect(manager.shouldAllowRequest(source, base + 50)).toBe(false);

    expect(manager.shouldAllowRequest(source, base + 150)).toBe(true);
    expect(manager.getState(source)?.status).toBe('half_open');

    manager.markSuccess(source);
    expect(manager.getState(source)?.status).toBe('closed');
    expect(manager.shouldAllowRequest(source, base + 151)).toBe(true);
  });

  it('reopens when half-open probe fails', () => {
    const manager = createSourceHealthManager({
      failureThreshold: 1,
      cooldownMs: 100,
    });
    const source = 'site-b';
    const base = 20_000;

    manager.markFailure(source, base);
    expect(manager.getState(source)?.status).toBe('open');
    expect(manager.shouldAllowRequest(source, base + 50)).toBe(false);

    expect(manager.shouldAllowRequest(source, base + 101)).toBe(true);
    expect(manager.getState(source)?.status).toBe('half_open');

    manager.markFailure(source, base + 102);
    expect(manager.getState(source)?.status).toBe('open');
    expect(manager.shouldAllowRequest(source, base + 150)).toBe(false);
  });
});
