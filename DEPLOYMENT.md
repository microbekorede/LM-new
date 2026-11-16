# Lumina Power System — deployment notes

## Optional booking email alerts

The booking form saves each request to Netlify Blobs first. Email alerts are optional and will not cause a booking to fail if the mail provider is unavailable.

To receive an email whenever a customer submits a booking:

1. Create or sign in to a Resend account and verify a sending domain/address.
2. In Netlify, open the Lumina site, then go to **Site configuration → Environment variables**.
3. Add these variables:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Your private Resend API key |
| `BOOKING_NOTIFICATION_EMAIL` | The inbox that should receive new booking alerts |
| `BOOKING_EMAIL_FROM` | A sender address verified in Resend, e.g. `Lumina Power <bookings@your-verified-domain.com>` |

4. Save the variables and trigger a new deploy so the Functions receive them.

Never put the Resend API key in website code, GitHub, or a public message.

## Request protection

The booking, contact and click-tracking endpoints have server-side per-IP request limits. The rate-limit store records a one-way hash of the network address, not the raw address.
