'use client';

export type NormalizedApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(error: NormalizedApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

function isJsonResponse(response: Response): boolean {
  return (
    response.headers.get('content-type')?.includes('application/json') ?? false
  );
}

function normalizeErrorPayload(
  path: string,
  status: number,
  payload: unknown,
): NormalizedApiError {
  if (payload && typeof payload === 'object') {
    const standardError = payload as {
      success?: boolean;
      error?: { code?: string; message?: string; details?: unknown } | string;
    };
    if (standardError.error && typeof standardError.error === 'object') {
      return {
        status,
        code: standardError.error.code || 'API_ERROR',
        message: standardError.error.message || `请求失败: ${path}`,
        details: standardError.error.details,
      };
    }
    if (typeof standardError.error === 'string') {
      return {
        status,
        code: 'API_ERROR',
        message: standardError.error || `请求失败: ${path}`,
      };
    }
  }
  return {
    status,
    code: 'API_ERROR',
    message: `请求失败: ${path} (${status})`,
  };
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  if (isJsonResponse(response)) {
    return response.json();
  }
  const text = await response.text();
  return text || undefined;
}

async function handleAuthExpired(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/auth/sessions/current', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {}

  const currentUrl = window.location.pathname + window.location.search;
  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('redirect', currentUrl);
  window.location.href = loginUrl.toString();
}

function withDefaultHeaders(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers || {});
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  return {
    credentials: 'include',
    ...init,
    headers,
  };
}

export async function requestWithAuth(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(path, withDefaultHeaders(init));

  if (response.ok) {
    return response;
  }

  const payload = await parseResponsePayload(response);
  if (response.status === 401) {
    await handleAuthExpired();
    throw new ApiClientError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: '用户未授权，已跳转到登录页面',
    });
  }

  throw new ApiClientError(
    normalizeErrorPayload(path, response.status, payload),
  );
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await requestWithAuth(path, init);
  const payload = await parseResponsePayload(response);

  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success?: boolean }).success === true &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function requestJsonPost<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function requestJsonDelete<TResponse>(
  path: string,
): Promise<TResponse> {
  return requestJson<TResponse>(path, { method: 'DELETE' });
}
