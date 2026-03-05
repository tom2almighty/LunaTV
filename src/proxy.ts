/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

import { verifyAuthSignature } from '@/server/api/auth-verifier';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminUsername = process.env.APP_ADMIN_USERNAME;
  const adminPassword = process.env.APP_ADMIN_PASSWORD;

  // 跳过不需要认证的路径
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  if (!adminUsername || !adminPassword) {
    // 如果没有设置管理员凭据，重定向到警告页面
    const warningUrl = new URL('/warning', request.url);
    return NextResponse.redirect(warningUrl);
  }

  // 从cookie获取认证信息
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo) {
    return handleAuthFailure(request, pathname);
  }

  // 检查是否有用户名和签名
  if (!authInfo.username || !authInfo.signature) {
    return handleAuthFailure(request, pathname);
  }

  // 验证签名
  const isValidSignature = await verifyAuthSignature(
    authInfo.username,
    authInfo.signature,
    adminPassword,
  );

  // 签名验证通过即可
  if (isValidSignature) {
    return NextResponse.next();
  }

  // 签名验证失败
  return handleAuthFailure(request, pathname);
}

// 处理认证失败的情况
function handleAuthFailure(
  request: NextRequest,
  pathname: string,
): NextResponse {
  // 如果是 API 路由，返回 401 状态码
  if (pathname.startsWith('/api')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 否则重定向到登录页面
  const loginUrl = new URL('/login', request.url);
  // 保留完整的URL，包括查询参数
  const fullUrl = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', fullUrl);
  return NextResponse.redirect(loginUrl);
}

// 判断是否需要跳过认证的路径
function shouldSkipAuth(pathname: string): boolean {
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/sw.js',
    '/sw.js.map',
    '/swe-worker-',
    '/icons/',
    '/logo.png',
    '/screenshot.png',
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

// 配置proxy匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|warning|api/auth/sessions|api/users|api/cron|api/public/site).*)',
  ],
};
