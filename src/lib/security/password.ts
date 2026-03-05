import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_VERSION = 'v1';
const PASSWORD_HASH_ALGO = 'pbkdf2_sha256';
const PASSWORD_HASH_DIGEST = 'sha256';
const PASSWORD_HASH_KEY_LENGTH = 32;
const PASSWORD_HASH_SALT_BYTES = 16;
const DEFAULT_PASSWORD_HASH_ITERATIONS = 120_000;

function getPasswordHashIterations(): number {
  const parsed = Number(process.env.PASSWORD_HASH_ITERATIONS);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_PASSWORD_HASH_ITERATIONS;
  }
  return parsed;
}

function parsePasswordHash(stored: string): {
  iterations: number;
  salt: Buffer;
  hash: Buffer;
} | null {
  const parts = stored.split('$');
  if (parts.length !== 5) {
    return null;
  }

  const [version, algo, iterationsText, saltText, hashText] = parts;
  if (version !== PASSWORD_HASH_VERSION || algo !== PASSWORD_HASH_ALGO) {
    return null;
  }

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return null;
  }

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const hash = Buffer.from(hashText, 'base64url');
    if (salt.length === 0 || hash.length === 0) {
      return null;
    }
    return { iterations, salt, hash };
  } catch {
    return null;
  }
}

export function hashPassword(plain: string): string {
  const iterations = getPasswordHashIterations();
  const salt = randomBytes(PASSWORD_HASH_SALT_BYTES);
  const hash = pbkdf2Sync(
    plain,
    salt,
    iterations,
    PASSWORD_HASH_KEY_LENGTH,
    PASSWORD_HASH_DIGEST,
  );

  return [
    PASSWORD_HASH_VERSION,
    PASSWORD_HASH_ALGO,
    String(iterations),
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parsed = parsePasswordHash(stored);
  if (!parsed) {
    return false;
  }

  const computed = pbkdf2Sync(
    plain,
    parsed.salt,
    parsed.iterations,
    PASSWORD_HASH_KEY_LENGTH,
    PASSWORD_HASH_DIGEST,
  );

  if (computed.length !== parsed.hash.length) {
    return false;
  }

  return timingSafeEqual(computed, parsed.hash);
}
