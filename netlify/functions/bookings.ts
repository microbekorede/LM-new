import { bodyOf, isAdmin, json, lagosToday, safeText, store, unauthorized, validPhone, withinRateLimit } from '../lib/shared';

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
    if (!(await withinRateLimit(request, 'booking', 5, 60 * 60 * 1000))) return json(429, { message: 'Too many booking attempts. Please wait before trying again.' });
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

    // Email is optional: booking storage remains successful even if notifications are not configured.
    const apiKey = process.env.RESEND_API_KEY;
    const notifyTo = process.env.BOOKING_NOTIFICATION_EMAIL;
    const from = process.env.BOOKING_EMAIL_FROM;
    if (apiKey && notifyTo && from) {
      const details = [
        `Booking reference: ${id}`,
        `Customer: ${customerName}`,
        `Phone: ${phone}`,
        `Email: ${email || 'Not provided'}`,
        `Service: ${booking.serviceType}`,
        `Property: ${booking.propertyType}`,
        `Estimated load: ${booking.estimatedLoad}`,
        `Address: ${address}`,
        `Preferred visit: ${preferredDate} — ${booking.preferredTime}`,
        `Notes: ${booking.notes || 'None'}`,
      ].join('\\n');
      try {
        const notice = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [notifyTo], subject: `New Lumina booking — ${id}`, text: details }),
        });
        if (!notice.ok) console.error('[bookings] Notification email failed:', notice.status, await notice.text());
      } catch (emailError) {
        console.error('[bookings] Notification email could not be sent:', emailError);
      }
    }
    return json(201, { booking });
  } catch (error) {
    console.error('[bookings] Request failed:', error);
    return json(500, { message: 'The booking service is temporarily unavailable. Please try again shortly.' });
  }
}
