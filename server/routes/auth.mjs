import { json, errorJson } from '../lib/response.mjs';
import {
  createAuthToken,
  getAuthConfig,
  isAuthorized,
  passwordMatches,
} from '../lib/auth.mjs';

export async function login(request, env) {
  const { adminPassword, authSecret } = getAuthConfig(env);
  if (!adminPassword || !authSecret) return errorJson('认证未配置', 500);
  const payload = await request.json().catch(() => null);
  const password = String(payload?.password || '');
  if (!passwordMatches(password, adminPassword)) return errorJson('密码错误', 401);
  return json({ token: await createAuthToken(env) });
}

export async function verify(request, env) {
  return (await isAuthorized(request, env))
    ? json({ ok: true })
    : errorJson('未登录或登录已过期', 401);
}
