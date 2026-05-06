export const AUTH_TOKEN_KEY = 'vodhub_auth_token';

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export function authHeaders(headers: HeadersInit = {}): Headers {
  const merged = new Headers(headers);
  const token = getAuthToken();
  if (token) merged.set('Authorization', `Bearer ${token}`);
  return merged;
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: authHeaders(init.headers || {}),
  });
}
