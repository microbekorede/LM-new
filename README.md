# Lumina Power System website

This is the complete Vite + React + TypeScript project for the Lumina website. The selected source is the uploaded `lumina_power_system_web_admin_portal (2).tsx`; it is saved as `src/App.tsx` and wrapped in a Vite entry point so Netlify can build it.

## Netlify build settings
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions` (configured in `netlify.toml`)

## Required Netlify environment variables
In Site configuration → Environment variables, add:
- `ADMIN_PASSWORD`: a new private admin password. Do not use a password already shared in chat or commit it to GitHub.
- `SESSION_SECRET`: a random secret of at least 32 characters.

Netlify Blobs stores booking requests and contact enquiries. Netlify enables Blobs for deployed sites; no database credentials are placed in the browser.

## Local preview
Run `npm install`, then `npm run dev`. To test the production build, run `npm run build`.

## Important
Bookings and contact enquiries are stored in Netlify Blobs. Email/SMS notifications are not configured. Keep the GitHub repository private because it contains the source code. Never commit `.env` or real secrets.
