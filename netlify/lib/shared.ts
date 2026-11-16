import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

export const json = (statusCode: number, data: unknown, headers: Record<string,string> = {}): HandlerResponse => ({
  statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }, body: JSON.stringify(data),
});
export const bodyOf = (event: HandlerEvent): any => { try { return event.body ? JSON.parse(event.body) : {}; } catch { return null; } };
export const store = () => getStore('lumina-production');
const cookieName = 'lumina_admin';
function sign(value: string) { const secret = process.env.SESSION_SECRET; if (!secret) throw new Error('SESSION_SECRET is not configured'); return createHmac('sha256', secret).update(value).digest('base64url'); }
export function sessionCookie(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000, nonce: randomUUID() })).toString('base64url');
  return `${cookieName}=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`;
}
export function clearSessionCookie() { return `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`; }
export function isAdmin(event: HandlerEvent): boolean {
  try {
    const raw = event.headers.cookie || event.headers.Cookie || '';
    const part = raw.split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`));
    if (!part) return false;
    const token = part.slice(cookieName.length + 1); const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(data.exp) && data.exp > Date.now();
  } catch { return false; }
}
export function unauthorized() { return json(401, { message: 'Please sign in to the admin portal.' }); }
export function validPhone(value: unknown) { return typeof value === 'string' && /^(?:0[789][01]\d{8}|\+?234[789][01]\d{8})$/.test(value.replace(/[\s()-]/g,'')); }
export function safeText(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
