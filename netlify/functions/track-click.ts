import type { Handler } from '@netlify/functions';
import { bodyOf, isAdmin, json, safeText, store, unauthorized } from '../lib/shared';

export const handler: Handler = async (event) => {
  const db = store();
  if (event.httpMethod === 'GET') {
    if (!isAdmin(event)) return unauthorized();
    const listed = await db.list({ prefix: 'click:' });
    const clicks = await Promise.all(listed.blobs.map(async item => await db.get(item.key, { type: 'json' })));
    clicks.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return json(200, { clicks: clicks.slice(0, 250), total: clicks.length });
  }
  if (event.httpMethod !== 'POST') return json(405, { message: 'Method not allowed.' });
  const body = bodyOf(event);
  if (!body) return json(400, { message: 'Invalid request body.' });
  const click = {
    id: crypto.randomUUID(),
    label: safeText(body.label, 100) || 'Unnamed click',
    destination: safeText(body.destination, 300),
    page: safeText(body.page, 120) || '/',
    createdAt: new Date().toISOString(),
  };
  await db.setJSON(`click:${click.id}`, click);
  return json(201, { ok: true });
};
