# Qudra Pager

A tablet-friendly café pager built with Vite, React, TypeScript, React Router, Supabase, and qrcode.react. English and Arabic interfaces include full RTL layout and remember the selected language.

## Setup

1. Install Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Use the public anon key, never a service-role key. These variables are embedded in the client bundle.
3. Ensure the schema below exists and create a business with slug `demo-cafe`.
4. Run `npm run dev`. Open the URL printed by Vite.
5. Run `npm run build` for production and `npm run preview` to preview it. Deploy `dist` to Vercel; `vercel.json` handles SPA routes.

HTTPS (or localhost) is required for service workers, notifications, and wake locks. Phones must be able to reach the application's public URL; a QR containing localhost cannot be opened from another device.

## Features

- `/`: product introduction and the three-step workflow.
- `/b/:slug/staff`: create a ticket with an optional note, share its QR/link, call or re-call, mark picked up, or cancel. Waiting and Ready include outstanding tickets from previous days; Done today uses the completion date.
- Daily completed count, average and longest creation-to-call time, and average rating for today's completed tickets. Re-calls update `called_at`, so these statistics use the latest call time.
- Branding settings for names, logo, colours, and Google review URL.
- `/t/:ticketId`: live customer ticket with realtime updates and a 10-second polling fallback. Staff also polls every 10 seconds if realtime disconnects.
- Enable alerts unlocks Web Audio, requests notification permission, and requests a screen wake lock when supported. Ready calls and re-calls trigger a repeating three-note chime, vibration, a service worker notification, page flash, and title change. Stop silences the alert; another re-call starts it again. Done or cancelled also stops it.
- Completed tickets accept 1–5 stars. Ratings of 4–5 show the configured Google review link. Ratings of 1–3 show a private feedback form; feedback never appears on the customer or staff queue cards.
- Minimal installable manifest and service worker with notification-click focus behavior. It does not cache customer data or provide offline mode.

## SQL schema

The supplied project already has these tables. This is a reference for a new project; do not re-run against existing tables without adapting it.

```sql
create extension if not exists pgcrypto;

create table public.pager_businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_ar text,
  logo_url text,
  primary_color text default '#193cba',
  accent_color text default '#ffad66',
  google_review_url text
);

create table public.pager_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.pager_businesses(id),
  number integer not null,
  note text,
  status text not null default 'waiting'
    check (status in ('waiting', 'ready', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  rating integer check (rating between 1 and 5),
  feedback text
);
create index on public.pager_tickets (business_id, created_at desc);

alter table public.pager_businesses enable row level security;
alter table public.pager_tickets enable row level security;

-- Demo only: these policies allow anyone with the public key to read
-- and modify every business and ticket. They do not provide privacy.
grant select, insert, update on public.pager_businesses to anon;
grant select, insert, update on public.pager_tickets to anon;
create policy demo_business_select on public.pager_businesses for select to anon using (true);
create policy demo_business_insert on public.pager_businesses for insert to anon with check (true);
create policy demo_business_update on public.pager_businesses for update to anon using (true) with check (true);
create policy demo_ticket_select on public.pager_tickets for select to anon using (true);
create policy demo_ticket_insert on public.pager_tickets for insert to anon with check (true);
create policy demo_ticket_update on public.pager_tickets for update to anon using (true) with check (true);
alter publication supabase_realtime add table public.pager_tickets;

insert into public.pager_businesses (slug, name, name_ar)
values ('demo-cafe', 'The daily café', 'المقهى اليومي');
```

## Limitations

- No server Web Push yet. Notifications originate from the open customer page; a service worker alone cannot receive new ticket events when the page is suspended or closed.
- Mobile browsers, especially iOS, may suspend timers, realtime, audio, and vibration when backgrounded or locked. iOS notifications require a supported version, installation with Add to Home Screen, and permission. Keep the ticket open and screen awake for the best results. Wake lock is best effort and reacquired when the page becomes visible.
- Demo RLS is open, and there is no staff login. UUID links are convenient identifiers, not access control. Feedback is private in the interface only; with demo policies it is accessible via the public API. Before production add staff authentication, business-scoped authorization, restricted customer access, and protected feedback storage.
- Ticket numbers use the maximum number since local midnight plus one. Concurrent devices can allocate the same number. Use a database transaction/RPC and a daily business counter for atomic numbering in production. Dates and statistics follow the staff device's timezone.
- External fonts need connectivity; system sans-serif fallbacks are provided. Branding URLs must use HTTP(S), and brand colours must be six-digit hex values.
