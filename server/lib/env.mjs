function processEnv() {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

export function readEnv(env, ...keys) {
  for (const key of keys) {
    const value = env?.[key] ?? processEnv()?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function readEnvInt(env, key, fallback) {
  const raw = readEnv(env, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
