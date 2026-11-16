import type { Handler } from '@netlify/functions';
import { bodyOf, isAdmin, json, safeText, store, unauthorized, validPhone } from '../lib/shared';

export const handler: Handler = async (event) => {
  const db = store();
  if (event.httpMethod === 'GET') {
    if (!isAdmin(event)) return unauthorized();
    const listed = await db.list({ prefix: 'contact:' });
    const messages = await Promise.all(listed.blobs.map(async item => await db.get(item.key, { type: 'json' })));
    messages.sort((a: any,b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return json(200, { messages });
  }
  if (event.httpMethod !== 'POST') return json(405, { message: 'Method not allowed.' });
  const body = bodyOf(event); if (!body) return json(400, { message: 'Invalid request body.' });
  const name = safeText(body.name,100), phone = safeText(body.phone,30), email = safeText(body.email,254), message = safeText(body.message,5000);
  if (!name || !validPhone(phone) || !message) return json(400, { message: 'Enter your name, a valid Nigerian phone number and a message.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { message: 'Please enter a valid email address.' });
  const id = crypto.randomUUID(); const contact = { id, name, phone, email, message, createdAt: new Date().toISOString() };
  await db.setJSON(`contact:${id}`, contact);
  return json(201, { message: 'Inquiry received.' });
};
