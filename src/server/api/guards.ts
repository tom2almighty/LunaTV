import { NextRequest } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

export function requireUsername(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  const username = authInfo?.username?.trim();
  if (!username) {
    throw new Error('Unauthorized');
  }

  return username;
}
