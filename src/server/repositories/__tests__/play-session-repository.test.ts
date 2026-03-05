import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/sqlite';

import { playSessionRepository } from '../play-session-repository';

describe('playSessionRepository', () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM play_sessions').run();
  });

  it('saves and loads a play session payload', () => {
    const payload = JSON.stringify({
      id: 'session-a',
      username: 'alice',
      currentSource: 's1',
    });

    playSessionRepository.upsert({
      sessionId: 'session-a',
      username: 'alice',
      payloadJson: payload,
      expiresAt: Date.now() + 30_000,
      updatedAt: Date.now(),
    });

    const loaded = playSessionRepository.getBySessionId('session-a');
    expect(loaded).not.toBeNull();
    expect(loaded?.username).toBe('alice');
    expect(loaded?.payloadJson).toBe(payload);
  });

  it('updates existing session on upsert', () => {
    const now = Date.now();
    playSessionRepository.upsert({
      sessionId: 'session-b',
      username: 'bob',
      payloadJson: JSON.stringify({ currentSource: 's1' }),
      expiresAt: now + 10_000,
      updatedAt: now,
    });

    playSessionRepository.upsert({
      sessionId: 'session-b',
      username: 'bob',
      payloadJson: JSON.stringify({ currentSource: 's2' }),
      expiresAt: now + 20_000,
      updatedAt: now + 1_000,
    });

    const loaded = playSessionRepository.getBySessionId('session-b');
    expect(loaded).not.toBeNull();
    expect(loaded?.payloadJson).toContain('s2');
  });

  it('deletes expired sessions', () => {
    const now = Date.now();
    playSessionRepository.upsert({
      sessionId: 'expired',
      username: 'eve',
      payloadJson: '{}',
      expiresAt: now - 1,
      updatedAt: now - 1,
    });
    playSessionRepository.upsert({
      sessionId: 'active',
      username: 'eve',
      payloadJson: '{}',
      expiresAt: now + 10_000,
      updatedAt: now,
    });

    const deleted = playSessionRepository.deleteExpired(now);
    expect(deleted).toBe(1);
    expect(playSessionRepository.getBySessionId('expired')).toBeNull();
    expect(playSessionRepository.getBySessionId('active')).not.toBeNull();
  });
});
