import { NextRequest, NextResponse } from 'next/server';
import { createSession, isAuthConfigured, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ message: 'Solicitud no válida.' }, { status: 403 });
  if (!isAuthConfigured()) return NextResponse.json({ message: 'La protección aún no está configurada en Vercel.' }, { status: 503 });
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 8) {
    return NextResponse.json({ message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)) } });
  }
  let password = '';
  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password === 'string' && body.password.length <= 1024) password = body.password;
  } catch {
    return NextResponse.json({ message: 'Solicitud no válida.' }, { status: 400 });
  }
  if (!verifyPassword(password)) {
    const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + 10 * 60 * 1000 };
    entry.count += 1;
    attempts.set(key, entry);
    return NextResponse.json({ message: 'La contraseña no coincide.' }, { status: 401 });
  }
  attempts.delete(key);
  const session = createSession();
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, session.value, sessionCookieOptions(session.maxAge));
  return response;
}
