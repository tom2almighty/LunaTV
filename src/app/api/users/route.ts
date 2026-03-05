/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, getSessionCookieExpires } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { checkUserExist, registerUser, saveAdminConfig } from '@/lib/db.server';

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

  if (username && process.env.APP_ADMIN_PASSWORD) {
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

export async function POST(request: NextRequest) {
  return executeApiHandler(
    request,
    async () => {
      const config = await getConfig();
      if (!config.SiteConfig.EnableRegistration) {
        return NextResponse.json({ error: '注册功能已关闭' }, { status: 403 });
      }

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
      if (username.length < 3 || username.length > 20) {
        return NextResponse.json(
          { error: '用户名长度必须在 3-20 个字符之间' },
          { status: 400 },
        );
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          { error: '用户名只能包含字母、数字和下划线' },
          { status: 400 },
        );
      }

      if (!password) {
        return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
      }
      if (password.length < 6 || password.length > 50) {
        return NextResponse.json(
          { error: '密码长度必须在 6-50 个字符之间' },
          { status: 400 },
        );
      }

      if (username === process.env.APP_ADMIN_USERNAME) {
        return NextResponse.json(
          { error: '该用户名已被使用' },
          { status: 400 },
        );
      }

      const userExists = await checkUserExist(username);
      if (userExists) {
        return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
      }

      await registerUser(username, password);

      config.UserConfig.Users.push({
        username,
        role: 'user',
        banned: false,
      });
      await saveAdminConfig(config);

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
