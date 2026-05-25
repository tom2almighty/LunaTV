import { apiFetch } from './client';

export async function login(password: string): Promise<string | null> {
  const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { token?: string };
  return data.token || null;
}

export async function verify(): Promise<boolean> {
  try {
    const resp = await apiFetch('/api/auth/verify');
    return resp.ok;
  } catch {
    return false;
  }
}
