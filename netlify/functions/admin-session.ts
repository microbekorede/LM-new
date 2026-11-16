import type { Handler } from '@netlify/functions';
import { bodyOf, clearSessionCookie, isAdmin, json, sessionCookie } from '../lib/shared';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'GET') return json(200, { authenticated: isAdmin(event) });
  if (event.httpMethod === 'DELETE') return json(200, { authenticated: false }, { 'Set-Cookie': clearSessionCookie() });
  if (event.httpMethod !== 'POST') return json(405, { message: 'Method not allowed.' });
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !process.env.SESSION_SECRET) return json(503, { message: 'Admin login is not configured yet. Set ADMIN_PASSWORD and SESSION_SECRET in Netlify.' });
  const body = bodyOf(event);
  if (!body || typeof body.password !== 'string' || body.password.length > 200 || body.password !== password) return json(401, { message: 'Incorrect admin password.' });
  return json(200, { authenticated: true }, { 'Set-Cookie': sessionCookie() });
};
