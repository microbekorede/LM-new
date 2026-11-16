import { bodyOf, isAdmin, json, safeText, store, unauthorized, validPhone, withinRateLimit } from '../lib/shared';

export default async function handler(request: Request): Promise<Response> {
  try {
    const db = store();
    if (request.method === 'GET') {
      if (!isAdmin(request)) return unauthorized();
      const listed = await db.list({ prefix: 'contact:' });
      const messages = await Promise.all(listed.blobs.map(async item => await db.get(item.key, { type: 'json' })));
      messages.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return json(200, { messages });
    }
    if (request.method !== 'POST') return json(405, { message: 'Method not allowed.' });
    if (!(await withinRateLimit(request, 'contact', 5, 60 * 60 * 1000))) return json(429, { message: 'Too many requests. Please wait and try again later.' });
    const body = await bodyOf(request);
    if (!body) return json(400, { message: 'Invalid request body.' });
    const name = safeText(body.name, 100);
    const phone = safeText(body.phone, 30);
    const email = safeText(body.email, 254);
    const message = safeText(body.message, 5000);
    if (!name || !validPhone(phone) || !message) return json(400, { message: 'Enter your name, a valid Nigerian phone number and a message.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { message: 'Please enter a valid email address.' });
    const id = crypto.randomUUID();
    const contact = { id, name, phone, email, message, createdAt: new Date().toISOString() };
    await db.setJSON(`contact:${id}`, contact);
    return json(201, { message: 'Inquiry received.' });
  } catch (error) {
    console.error('[contact] Request failed:', error);
    return json(500, { message: 'The contact service is temporarily unavailable. Please try again shortly.' });
  }
}
