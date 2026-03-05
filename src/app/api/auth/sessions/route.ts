/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, getSessionCookieExpires } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { verifyUser } from '@/lib/db.server';

import { ApiValidationError, executeApiHandler } from '@/server/api/handler';

export const runtime = 'nodejs';

async function generateSignature(
  data: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateAuthCookie(username: string): Promise<string> {
  const authData: Record<string, string | number> = {};

  if (process.env.APP_ADMIN_PASSWORD) {
    authData.username = username;
    const signature = await generateSignature(
      username,
      process.env.APP_ADMIN_PASSWORD,
    );
    authData.signature = signature;
    authData.timestamp = Date.now();
  }

  return encodeURIComponent(JSON.stringify(authData));
}

async function buildSessionResponse(username: string): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  const cookieValue = await generateAuthCookie(username);

  response.cookies.set(AUTH_COOKIE_NAME, cookieValue, {
    path: '/',
    expires: getSessionCookieExpires(),
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export async function POST(request: NextRequest) {
  return executeApiHandler(
    request,
    async () => {
      let body: { username?: unknown; password?: unknown };
      try {
        body = await request.json();
      } catch {
        throw new ApiValidationError('请求体格式错误');
      }

      const username = typeof body.username === 'string' ? body.username : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!username) {
        return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
      }
      if (!password) {
        return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
      }

      if (
        username === process.env.APP_ADMIN_USERNAME &&
        password === process.env.APP_ADMIN_PASSWORD
      ) {
        return buildSessionResponse(username);
      }
      if (username === process.env.APP_ADMIN_USERNAME) {
        return NextResponse.json(
          { error: '用户名或密码错误' },
          { status: 401 },
        );
      }

      const config = await getConfig();
      const user = config.UserConfig.Users.find(
        (item) => item.username === username,
      );
      if (user?.banned) {
        return NextResponse.json({ error: '用户被封禁' }, { status: 401 });
      }

      try {
        const pass = await verifyUser(username, password);
        if (!pass) {
          return NextResponse.json(
            { error: '用户名或密码错误' },
            { status: 401 },
          );
        }

        return buildSessionResponse(username);
      } catch (error) {
        console.error('数据库验证失败', error);
        return NextResponse.json({ error: '数据库错误' }, { status: 500 });
      }
    },
    {
      responseShape: 'raw',
      onError: (_, mappedError) => {
        if (mappedError.status !== 500) {
          return undefined;
        }
        return NextResponse.json({ error: '服务器错误' }, { status: 500 });
      },
    },
  );
}
