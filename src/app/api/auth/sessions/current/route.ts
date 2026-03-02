import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set('auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: false,
    secure: false,
  });

  return response;
}
