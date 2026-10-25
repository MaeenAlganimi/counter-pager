# Counter Pager

A café counter and customer pager built with Vite, React, TypeScript and Supabase. The original blue/apricot ticket design now includes item entry, pickup estimates, staff PIN sessions and server Web Push.

## Run and deploy

```sh
npm install
cp .env.example .env.local
npm run dev
npm run build
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. This file is ignored by Git. Only the public anon key belongs in the frontend. Never put service-role keys, VAPID private keys, or signing credentials in Vite variables.

The migration assumes the existing `pager_businesses` and `pager_tickets` tables from v1 exist. Apply `supabase/migrations/002_v2.sql` using the Supabase SQL editor or `supabase db push` against the linked project. Back up existing data first. It preserves tickets, removes old open ticket policies, revokes browser table access, removes tickets from the database realtime publication, and installs atomic per-business daily numbering. The existing public business read policy remains, limited to branding columns. The demo business's unset PIN becomes 1234; other businesses must receive a hash explicitly.

```sh
supabase functions deploy pager-api
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to the function. The API uses the public anon JWT in both `apikey` and `Authorization: Bearer …` headers. If your project uses a newer non-JWT publishable key instead, use the legacy anon JWT for this app's configured gateway authentication.

Deploy `dist` to an HTTPS SPA host. `vercel.json` contains route fallback configuration. QR links must point to a public URL reachable by the customer's phone.

## Architecture

The browser never queries or mutates tables. Every data request posts JSON `{action, ...}` to `${VITE_SUPABASE_URL}/functions/v1/pager-api`. The self-contained Deno function uses service-role access and explicit authorization:

- `business`: public branding and VAPID public key; no PIN hashes or secrets.
- `staff_login`: validates SHA-256 of `slug + ':' + pin`; issues an HMAC-SHA256 token expiring in 12 hours. The browser keeps it in sessionStorage and sends it as the JSON `token` field.
- Staff `list`, `create`, `update_eta`, `set_status`, `branding`, `push_test` scope all operations to the signed business. `push_test` takes a ticket ID.
- Customer `ticket`, `subscribe`, `rate`, `google_wallet`, `apple_wallet` require the ticket's secret UUID. Treat QR links as bearer credentials. Customer responses omit private feedback.
- Tickets use UTC service days. Lists/statistics include orders created today; average/longest wait measure creation to most recent call. On-time percentage compares that call with the current ETA.
- REST realtime broadcasts on `ticket-<uuid>` and `biz-<business_id>` contain only empty invalidation payloads. Clients subscribe with supabase-js then refetch via the function; five-second polling is the fallback. No database change stream is exposed.
- ETA changes, calls, recalls and completion send Web Push. Creation only broadcasts to staff. Expired 404/410 subscriptions are removed. No customer data is cached by the service worker.

For production, configure API gateway rate limiting for PIN login, rotate staff PINs regularly, and restrict operational access to the secrets table. SHA-256 PIN storage follows the specified schema; a short PIN still requires online brute-force protection. The SQL trigger serializes daily numbering across cashier devices.

## Server secrets

Insert values through the SQL editor or another privileged server connection. `pager_secrets` and `pager_push_subs` have RLS and no browser policies. Keep their contents out of source control.

```sql
insert into public.pager_secrets(key,value) values
 ('token_secret', encode(gen_random_bytes(32),'hex')),
 ('vapid_public', '<public base64url key>'),
 ('vapid_private', '<private base64url key>'),
 ('vapid_subject', 'mailto:operations@example.com'),
 ('public_app_url', 'https://your-app.example')
on conflict (key) do update set value=excluded.value;

-- Set an individual business PIN; replace both values.
update public.pager_businesses
set staff_pin_hash=encode(digest(slug || ':' || '987654','sha256'),'hex')
where slug='your-cafe';
```

Generate a VAPID pair with `npx web-push generate-vapid-keys`. Configure all three VAPID values to enable server pushes. The function supports standard Google, Mozilla, Apple and Windows push endpoints.

## Product flow

- `/`: introduction and demo instructions.
- `/b/demo-cafe/staff`: PIN 1234, demo café menu tiles, quantities, custom items/total, note and ETA. Creating an order shows a large QR. The live queue provides ETA adjustments, ready/re-call, pickup, cancel and test alert controls. Branding settings include name, logo, colours and review URL.
- `/b/:slug/staff`: the same counter for other businesses, without demo menu or PIN hint.
- `/t/:ticketId`: branded order, items/total, countdown and ETA change notice, timestamp timeline, install and lock-screen alert controls, and completion rating. Four/five stars offer the configured Google review link; lower ratings offer private feedback.

English/Arabic language selection and RTL remain available; newly added counter controls currently use English. Branding colours and currency are business-specific.

## Mobile notifications

HTTPS or localhost is required. Tap **Turn on lock-screen alerts** to grant permission, register the service worker and store a Web Push subscription. Android browsers supporting Web Push can receive notifications while the page is closed; an install button appears when the browser supplies an install prompt. iPhone/iPad require iOS/iPadOS 16.4 or later and installation using Share → Add to Home Screen, then permission from the installed app. See [WebKit's Web Push guidance](https://webkit.org/blog/13878/).

The open page also chimes, vibrates and flashes on ready/re-call after the user enables alerts. Wake Lock is best effort and reacquired on return. Browser settings, power saving and device support can affect delivery, audio and vibration. The manifest starts at `/`; retain or reopen the private order URL after installing from an iPhone's browser.

## Wallet

Buttons stay hidden while the API reports unavailable.

Google Wallet: add `google_wallet_issuer_id` and `google_wallet_service_account_json` (the complete Google service account JSON) to `pager_secrets`, plus `public_app_url`. Enable Google Wallet API, authorize the service account for the issuer, and complete issuer onboarding. The JWT includes the Generic class `<issuer_id>.pager_orders` and the order object, creating them on save. The function constructs a Generic object with order/status/ETA and QR, signs an RS256 `savetowallet` JWT with Web Crypto, and returns the save URL. See [Google's web issuance guide](https://developers.google.com/wallet/generic/web). This is a snapshot; subsequent ticket updates are visible via the QR, not automatically synchronized into Wallet.

Apple Wallet: signing is scaffolded in [wallet/apple](wallet/apple/README.md). It needs a Pass Type ID, team ID, signer certificate/private key and WWDR intermediate certificate plus a trusted Node signing service. Until that service is deployed and connected, `apple_wallet` returns `available:false` and the UI hides its button.

## Verification

`npm run build` checks the frontend TypeScript and emits the production bundle. The Edge Function is separate Deno code and must also be checked with `deno check --no-lock --node-modules-dir=auto supabase/functions/pager-api/index.ts`. Before launch, verify PIN rejection/session expiry, cross-business authorization, two concurrent order creations, QR tracking, ETA and ready push on physical Android/iPhone devices, recall, pickup and private feedback against your deployed project. Browser table requests with the anon key should fail for tickets/secrets/subscriptions and the PIN hash.

Local validation completed: production build; Deno type check; browser handoff/rating/logout flows against controlled API responses at desktop, tablet and phone widths; real Deno handler tests against a controlled database transport, including Google JWT signature verification; isolated PostgreSQL migration/RLS checks and ten concurrent number allocations; service worker notification/click checks. External push delivery and wallet provider acceptance still require configured credentials and physical-device validation.
