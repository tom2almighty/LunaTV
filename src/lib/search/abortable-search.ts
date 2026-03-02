export type AbortableSearchController = {
  signal: AbortSignal;
  abort: (reason?: string) => void;
};

export function createAbortableSearchController(): AbortableSearchController {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    abort: (reason) => {
      controller.abort(reason);
    },
  };
}

export function composeAbortSignal(
  timeoutSignal: AbortSignal,
  externalSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  if (!externalSignal) {
    return {
      signal: timeoutSignal,
      cleanup: () => {},
    };
  }

  if (externalSignal.aborted) {
    return {
      signal: externalSignal,
      cleanup: () => {},
    };
  }

  if (timeoutSignal.aborted) {
    return {
      signal: timeoutSignal,
      cleanup: () => {},
    };
  }

  const mergedController = new AbortController();

  const abortFromExternal = () => {
    mergedController.abort(externalSignal.reason);
  };
  const abortFromTimeout = () => {
    mergedController.abort(timeoutSignal.reason);
  };

  externalSignal.addEventListener('abort', abortFromExternal, { once: true });
  timeoutSignal.addEventListener('abort', abortFromTimeout, { once: true });

  return {
    signal: mergedController.signal,
    cleanup: () => {
      externalSignal.removeEventListener('abort', abortFromExternal);
      timeoutSignal.removeEventListener('abort', abortFromTimeout);
    },
  };
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  if (typeof error === 'object' && error !== null) {
    const typedError = error as { code?: number; message?: string };
    return (
      typedError.code === 20 ||
      typedError.message?.toLowerCase().includes('aborted') === true
    );
  }

  return false;
}
