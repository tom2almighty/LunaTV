import { beforeEach, describe, expect, it } from 'vitest';

import {
  createPlaySession,
  getPlaySession,
  setPlaySessionCurrent,
} from '@/lib/play-session';
import { SearchResult } from '@/lib/types';

import { playSessionRepository } from '@/server/repositories/play-session-repository';

function buildCandidate(source: string, id: string): SearchResult {
  return {
    id,
    source,
    source_name: source,
    title: `title-${id}`,
    poster: '',
    year: '2024',
    episodes: ['https://example.com/1.m3u8'],
    episodes_titles: ['1'],
    class: '',
    desc: '',
    type_name: '',
    douban_id: 0,
    score: '',
    actors: '',
    directors: '',
    area: '',
    lang: '',
    remark: '',
  };
}

describe('play-session persistence', () => {
  beforeEach(() => {
    const now = Date.now();
    playSessionRepository.deleteExpired(now + 365 * 24 * 60 * 60 * 1000);
  });

  it('persists created session into sqlite repository', () => {
    const session = createPlaySession({
      username: 'alice',
      title: 'hello',
      candidates: [buildCandidate('s1', '1')],
    });

    const stored = playSessionRepository.getBySessionId(session.id);
    expect(stored).not.toBeNull();
    expect(stored?.username).toBe('alice');
  });

  it('persists current source update', () => {
    const session = createPlaySession({
      username: 'alice',
      title: 'hello',
      candidates: [buildCandidate('s1', '1'), buildCandidate('s2', '2')],
    });

    setPlaySessionCurrent(session, 's2', '2');
    const stored = playSessionRepository.getBySessionId(session.id);
    expect(stored).not.toBeNull();

    const payload = JSON.parse(String(stored?.payloadJson)) as {
      currentSource: string;
      currentId: string;
    };
    expect(payload.currentSource).toBe('s2');
    expect(payload.currentId).toBe('2');
  });

  it('loads session by username and id', () => {
    const session = createPlaySession({
      username: 'alice',
      title: 'hello',
      candidates: [buildCandidate('s1', '1')],
    });

    const loaded = getPlaySession('alice', session.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(session.id);
  });
});
