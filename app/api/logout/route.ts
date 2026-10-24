import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/security.mjs';
import { SESSION_COOKIE } from '@/lib/server';
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Запрещено' }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'strict' });
  return res;
}
