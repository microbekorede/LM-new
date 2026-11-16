import type { Handler } from '@netlify/functions';
import { bodyOf, isAdmin, json, safeText, store, unauthorized } from '../lib/shared';

export const handler: Handler = async (event) => {
  if (!isAdmin(event)) return unauthorized();
  if (event.httpMethod !== 'PATCH') return json(405, { message: 'Method not allowed.' });
  const id = decodeURIComponent((event.path.split('/').pop() || '').trim());
  if (!/^LPS-[A-F0-9]{8}$/.test(id)) return json(400, { message: 'Invalid booking reference.' });
  const db = store(); const booking: any = await db.get(`booking:${id}`, { type: 'json' });
  if (!booking) return json(404, { message: 'Booking not found.' });
  const body = bodyOf(event); if (!body) return json(400, { message: 'Invalid request body.' });
  if (body.status !== undefined) {
    if (!['Pending','Confirmed','In Progress','Completed'].includes(body.status)) return json(400, { message: 'Invalid booking status.' });
    booking.status = body.status;
  }
  if (body.assignedEngineer !== undefined) booking.assignedEngineer = safeText(body.assignedEngineer,100);
  booking.updatedAt = new Date().toISOString();
  await db.setJSON(`booking:${id}`, booking);
  return json(200, { booking });
};
