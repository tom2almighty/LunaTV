type SourceHealthStatus = 'closed' | 'open' | 'half_open';

type SourceHealthState = {
  status: SourceHealthStatus;
  failureCount: number;
  openedAt: number | null;
};

type SourceHealthOptions = {
  failureThreshold: number;
  cooldownMs: number;
};

function normalizeThreshold(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.floor(value);
}

function normalizeCooldown(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function createSourceHealthManager(options: SourceHealthOptions) {
  const failureThreshold = normalizeThreshold(options.failureThreshold);
  const cooldownMs = normalizeCooldown(options.cooldownMs);
  const states = new Map<string, SourceHealthState>();

  function getOrCreateState(sourceKey: string): SourceHealthState {
    const existing = states.get(sourceKey);
    if (existing) {
      return existing;
    }

    const initial: SourceHealthState = {
      status: 'closed',
      failureCount: 0,
      openedAt: null,
    };
    states.set(sourceKey, initial);
    return initial;
  }

  function shouldAllowRequest(sourceKey: string, now = Date.now()): boolean {
    const state = getOrCreateState(sourceKey);

    if (state.status === 'open') {
      if (state.openedAt === null || now - state.openedAt < cooldownMs) {
        return false;
      }
      state.status = 'half_open';
      return true;
    }

    return true;
  }

  function markSuccess(sourceKey: string): void {
    const state = getOrCreateState(sourceKey);
    state.status = 'closed';
    state.failureCount = 0;
    state.openedAt = null;
  }

  function markFailure(sourceKey: string, now = Date.now()): void {
    const state = getOrCreateState(sourceKey);

    if (state.status === 'half_open') {
      state.status = 'open';
      state.failureCount = failureThreshold;
      state.openedAt = now;
      return;
    }

    if (state.status === 'closed') {
      state.failureCount += 1;
      if (state.failureCount >= failureThreshold) {
        state.status = 'open';
        state.openedAt = now;
      }
      return;
    }

    state.openedAt = now;
  }

  function getState(sourceKey: string) {
    const state = states.get(sourceKey);
    if (!state) return null;
    return { ...state };
  }

  return {
    shouldAllowRequest,
    markSuccess,
    markFailure,
    getState,
  };
}
