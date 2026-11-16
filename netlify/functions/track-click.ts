import { randomUUID } from 'node:crypto';
import { bodyOf, isAdmin, json, safeText, store, unauthorized } from '../lib/shared';

export default async function handler(request: Request): Promise<Response> {
  try {
    const db = store();
    if (request.method === 'GET') {
      if (!isAdmin(request)) return unauthorized();
      const listed = await db.list({ prefix: 'click:' });
      const clicks = await Promise.all(listed.blobs.map(async item => await db.get(item.key, { type: 'json' })));
      clicks.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return json(200, { clicks: clicks.slice(0, 250), total: clicks.length });
    }
    if (request.method !== 'POST') return json(405, { message: 'Method not allowed.' });
    const body = await bodyOf(request);
    if (!body) return json(400, { message: 'Invalid request body.' });
    const click = {
      id: randomUUID(),
      label: safeText(body.label, 100) || 'Unnamed click',
      destination: safeText(body.destination, 300),
      page: safeText(body.page, 120) || '/',
      createdAt: new Date().toISOString(),
    };
    await db.setJSON(`click:${click.id}`, click);
    return json(201, { ok: true });
  } catch (error) {
    console.error('[track-click] Request failed:', error);
    return json(500, { message: 'Click tracking is temporarily unavailable.' });
  }
}
