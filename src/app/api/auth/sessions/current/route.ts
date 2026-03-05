import { NextRequest, NextResponse } from 'next/server';

import { executeApiHandler } from '@/server/api/handler';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  return executeApiHandler(
    request,
    async () => {
      const response = NextResponse.json({ ok: true });

      response.cookies.set('auth', '', {
        path: '/',
        expires: new Date(0),
        sameSite: 'lax',
        httpOnly: false,
        secure: false,
      });

      return response;
    },
    {
      responseShape: 'raw',
    },
  );
}
