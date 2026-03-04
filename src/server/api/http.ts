import { NextResponse } from 'next/server';

export function jsonOk<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonServerError(message = 'Internal Server Error') {
  return NextResponse.json({ error: message }, { status: 500 });
}
