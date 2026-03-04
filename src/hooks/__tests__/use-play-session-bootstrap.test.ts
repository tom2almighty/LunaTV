import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('play session bootstrap contract', () => {
  it('uses RESTful play session endpoints', () => {
    const content = readFileSync(
      'src/hooks/usePlaySessionBootstrap.ts',
      'utf8',
    );

    expect(content.includes('/api/play/sessions')).toBe(true);
    expect(content.includes('/api/play/bootstrap')).toBe(false);
    expect(content.includes('/api/play/session?ps=')).toBe(false);
  });

  it('uses nested current route for play session switching', () => {
    const sessionRoute = readFileSync(
      'src/app/api/play/sessions/[sessionId]/route.ts',
      'utf8',
    );
    const currentRoute = readFileSync(
      'src/app/api/play/sessions/[sessionId]/current/route.ts',
      'utf8',
    );

    expect(sessionRoute.includes('export async function PATCH')).toBe(false);
    expect(currentRoute.includes('export async function PATCH')).toBe(true);
  });

  it('does not build legacy fallback play query params in video card', () => {
    const content = readFileSync('src/components/VideoCard.tsx', 'utf8');

    expect(content.includes('/play?source=')).toBe(false);
    expect(content.includes('&stitle=')).toBe(false);
    expect(content.includes('&stype=')).toBe(false);
    expect(content.includes('&sname=')).toBe(false);
  });
});
