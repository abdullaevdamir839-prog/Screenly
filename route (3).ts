import { NextRequest, NextResponse } from 'next/server';
import { checkAlphaCode, createSession, limited, sameOrigin } from '@/lib/security.mjs';
import { requireSettings, SESSION_COOKIE } from '@/lib/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const ip = req.headers.get('x-real-ip') || 'local';
  if (limited(`login:${ip}`, 8, 10 * 60 * 1000)) return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  let settings;
  try { settings = requireSettings(); }
  catch { return NextResponse.json({ error: 'Сервер не настроен. Проверьте .env.local.' }, { status: 503 }); }
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 }); }
  const code = (body && typeof body === 'object' && 'code' in body) ? (body as { code: unknown }).code : null;
  if (!checkAlphaCode(code, settings.alphaCode)) return NextResponse.json({ error: 'Неверный код доступа' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSession(settings.sessionSecret), {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 60 * 60
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
