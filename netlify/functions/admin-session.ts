import { bodyOf, clearSessionCookie, isAdmin, json, sessionCookie } from '../lib/shared';

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') return json(200, { authenticated: isAdmin(request) });
  if (request.method === 'DELETE') return json(200, { authenticated: false }, { 'Set-Cookie': clearSessionCookie() });
  if (request.method !== 'POST') return json(405, { message: 'Method not allowed.' });
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !process.env.SESSION_SECRET) return json(503, { message: 'Admin login is not configured yet. Set ADMIN_PASSWORD and SESSION_SECRET in Netlify.' });
  const body = await bodyOf(request);
  if (!body || typeof body.password !== 'string' || body.password.length > 200 || body.password !== password) {
    return json(401, { message: 'Incorrect admin password.' });
  }
  return json(200, { authenticated: true }, { 'Set-Cookie': sessionCookie() });
}
