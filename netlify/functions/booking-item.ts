import { bodyOf, isAdmin, json, safeText, store, unauthorized } from '../lib/shared';

export default async function handler(request: Request): Promise<Response> {
  try {
    if (!isAdmin(request)) return unauthorized();
    if (request.method !== 'PATCH') return json(405, { message: 'Method not allowed.' });
    const pathname = new URL(request.url).pathname;
    const id = decodeURIComponent((pathname.split('/').pop() || '').trim());
    if (!/^LPS-[A-F0-9]{8}$/.test(id)) return json(400, { message: 'Invalid booking reference.' });
    const db = store();
    const booking: any = await db.get(`booking:${id}`, { type: 'json' });
    if (!booking) return json(404, { message: 'Booking not found.' });
    const body = await bodyOf(request);
    if (!body) return json(400, { message: 'Invalid request body.' });
    if (body.status !== undefined) {
      if (!['Pending', 'Confirmed', 'In Progress', 'Completed'].includes(body.status)) return json(400, { message: 'Invalid booking status.' });
      booking.status = body.status;
    }
    if (body.assignedEngineer !== undefined) booking.assignedEngineer = safeText(body.assignedEngineer, 100);
    booking.updatedAt = new Date().toISOString();
    await db.setJSON(`booking:${id}`, booking);
    return json(200, { booking });
  } catch (error) {
    console.error('[booking-item] Request failed:', error);
    return json(500, { message: 'The booking update service is temporarily unavailable.' });
  }
}
