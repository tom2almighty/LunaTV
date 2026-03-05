import { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'auth';
const DEFAULT_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthCookieInfo = {
  username?: string;
  signature?: string;
  timestamp?: number;
};

function parseAuthCookieJson(decodedValue: string): AuthCookieInfo | null {
  try {
    const authData = JSON.parse(decodedValue) as {
      username?: unknown;
      signature?: unknown;
      timestamp?: unknown;
    };

    return {
      username:
        typeof authData.username === 'string' ? authData.username : undefined,
      signature:
        typeof authData.signature === 'string' ? authData.signature : undefined,
      timestamp:
        typeof authData.timestamp === 'number' ? authData.timestamp : undefined,
    };
  } catch {
    return null;
  }
}

function parseAuthCookieValue(value: string): AuthCookieInfo | null {
  try {
    const decoded = decodeURIComponent(value);
    return parseAuthCookieJson(decoded);
  } catch {
    return null;
  }
}

export function getSessionMaxAgeMs(): number {
  const parsed = Number(process.env.SESSION_MAX_AGE_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_MAX_AGE_MS;
  }
  return Math.floor(parsed);
}

export function getSessionCookieExpires(now = Date.now()): Date {
  return new Date(now + getSessionMaxAgeMs());
}

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(
  request: NextRequest,
): AuthCookieInfo | null {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

  if (!authCookie) {
    return null;
  }

  return parseAuthCookieValue(authCookie.value);
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): AuthCookieInfo | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce(
      (acc, cookie) => {
        const trimmed = cookie.trim();
        const firstEqualIndex = trimmed.indexOf('=');

        if (firstEqualIndex > 0) {
          const key = trimmed.substring(0, firstEqualIndex);
          const value = trimmed.substring(firstEqualIndex + 1);
          if (key && value) {
            acc[key] = value;
          }
        }

        return acc;
      },
      {} as Record<string, string>,
    );

    const authCookie = cookies[AUTH_COOKIE_NAME];
    if (!authCookie) {
      return null;
    }

    return parseAuthCookieValue(authCookie);
  } catch {
    return null;
  }
}
