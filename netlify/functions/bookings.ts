import { bodyOf, isAdmin, json, lagosToday, safeText, store, unauthorized, validPhone } from '../lib/shared';

export default async function handler(request: Request): Promise<Response> {
  try {
    const db = store();
    if (request.method === 'GET') {
      if (!isAdmin(request)) return unauthorized();
      const listed = await db.list({ prefix: 'booking:' });
      const bookings = await Promise.all(listed.blobs.map(async item => await db.get(item.key, { type: 'json' })));
      bookings.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return json(200, { bookings });
    }
    if (request.method !== 'POST') return json(405, { message: 'Method not allowed.' });
    const body = await bodyOf(request);
    if (!body) return json(400, { message: 'Invalid request body.' });
    const customerName = safeText(body.customerName, 100);
    const phone = safeText(body.phone, 30);
    const address = safeText(body.address, 240);
    const preferredDate = safeText(body.preferredDate, 10);
    const email = safeText(body.email, 254);
    if (!customerName || !address || !validPhone(phone) || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
      return json(400, { message: 'Please provide a name, valid Nigerian phone number, address and visit date.' });
    }
    if (preferredDate < lagosToday()) return json(400, { message: 'Please choose today or a future date.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { message: 'Please enter a valid email address.' });
    const id = `LPS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const booking = {
      id, customerName, phone, address, email,
      serviceType: safeText(body.serviceType, 120),
      propertyType: safeText(body.propertyType, 100),
      estimatedLoad: safeText(body.estimatedLoad, 150),
      preferredDate,
      preferredTime: safeText(body.preferredTime, 100),
      notes: safeText(body.notes, 500),
      status: 'Pending', assignedEngineer: '', createdAt: new Date().toISOString(),
    };
    await db.setJSON(`booking:${id}`, booking);
    return json(201, { booking });
  } catch (error) {
    console.error('[bookings] Request failed:', error);
    return json(500, { message: 'The booking service is temporarily unavailable. Please try again shortly.' });
  }
}
