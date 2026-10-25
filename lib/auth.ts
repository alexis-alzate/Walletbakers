import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'bolsillo_session';
const SESSION_SECONDS = 12 * 60 * 60;
function secret() {
  const value = process.env.AUTH_SECRET;
  return value && Buffer.byteLength(value, 'utf8') >= 32 ? value : null;
}
function sign(exp: string, key: string) {
  return createHmac('sha256', key).update('bolsillo:' + exp).digest('base64url');
}
export function isAuthConfigured() {
  return Boolean(process.env.DASHBOARD_PASSWORD && process.env.DASHBOARD_PASSWORD.length >= 12 && secret());
}
export function verifyPassword(password: string) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || !secret()) return false;
  const candidate = createHmac('sha256', 'bolsillo-password-check').update(password).digest();
  const saved = createHmac('sha256', 'bolsillo-password-check').update(expected).digest();
  return timingSafeEqual(candidate, saved);
}
export function createSession() {
  const key = secret();
  if (!key) throw new Error('AUTH_SECRET must have at least 32 characters.');
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return { value: exp + '.' + sign(exp, key), maxAge: SESSION_SECONDS };
}
export function verifySession(value?: string) {
  const key = secret();
  if (!value || !key) return false;
  const [exp, supplied, extra] = value.split('.');
  if (!exp || !supplied || extra || !/^\d+$/.test(exp) || Number(exp) <= Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(exp, key));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function hasValidSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge };
}
