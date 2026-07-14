# PalletTrack — Setup & Operations Guide

Deployment, configuration, and team-install instructions. For what the
product is, see the [README](../README.md).

---

## 1. Supabase setup

1. Create a Supabase project (or use an existing one).
2. **Schema:** open the SQL editor and run [`supabase/schema.sql`](../supabase/schema.sql).
   This creates the `orders` + `push_subscriptions` tables, the
   order-number sequence, the realtime ping trigger, and
   both storage buckets (`order-photos`, `order-voices`).
3. **Edge functions:** install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy send-reminders --no-verify-jwt
   supabase functions deploy cleanup-dispatched --no-verify-jwt
   ```

4. **Function secrets** (Dashboard → Edge Functions → Secrets, or CLI):

   ```sh
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... CRON_SECRET=...
   ```

   `CRON_SECRET` is any long random string (`openssl rand -hex 24`).
5. **Schedules:** edit [`supabase/cron.sql`](../supabase/cron.sql) — replace
   `<PROJECT_REF>` and `<CRON_SECRET>` — and run it in the SQL editor.
   This schedules the reminder pushes (7:00 / 13:00 / 19:00 IST) and the
   daily cleanup of orders dispatched more than 3 days ago.

## 2. Generate VAPID keys

```sh
npx web-push generate-vapid-keys
```

Public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Vercel env) **and**
`VAPID_PUBLIC_KEY` (Supabase function secret).
Private key → `VAPID_PRIVATE_KEY` in both places. Never in client code.

## 3. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Set every variable from [`.env.example`](../.env.example) in Vercel →
   Project → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API
   - `APP_PIN` — the team PIN (4–6 digits)
   - `AUTH_COOKIE_SECRET` — `openssl rand -hex 32`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
3. Deploy. Done — share the URL with the team.

Local development: copy `.env.example` to `.env.local`, fill it in, then

```sh
npm install
npm run dev
```

## 4. 📱 Install guide for the team (forward this on WhatsApp)

> **PalletTrack — install it once, 1 minute** 🪵
>
> **iPhone:**
> 1. Open the link in **Safari**
> 2. Tap the **Share** button (square with arrow ⬆️)
> 3. Tap **"Add to Home Screen"**, then **Add**
> 4. Open the app **from the new icon** on your home screen
> 5. Enter the team PIN
> 6. Tap the big orange **"🔔 TURN ON NOTIFICATIONS"** button → **Allow**
>
> **Android:**
> 1. Open the link in **Chrome**
> 2. Tap **"Install app"** when it pops up (or menu ⋮ → **"Add to Home screen"**)
> 3. Open the app from the icon
> 4. Enter the team PIN
> 5. Tap **"🔔 TURN ON NOTIFICATIONS"** → **Allow**
>
> That's it. Every new order will now ping your phone instantly. ✅

⚠️ On iPhone, notifications **only work after installing to the Home
Screen** (iOS 16.4+) and opening the app from that icon. Android works in
the browser too, but everyone should install it anyway.

## 5. Resetting order numbers

Order numbers run **1 → 1000** and then automatically wrap back to 1.
To wipe everything and restart numbering at #1 right now (e.g. after
testing):

```sh
npm run reset-orders
```

This deletes ALL orders (pending too!) plus their photos and voice
notes, and the next order will be #1. It needs `.env.local` filled in.

## 6. Changing the PIN or reminder times

- **PIN:** change `APP_PIN` in Vercel env vars and redeploy. Everyone's
  existing login cookie stays valid; only new logins need the new PIN.
  (To force everyone to re-enter the PIN, also change `AUTH_COOKIE_SECRET`.)
- **Reminder times:** the schedule lives in pg_cron (UTC!). In the
  Supabase SQL editor run `select cron.unschedule('send-reminders-noon');`
  (etc.) and re-run the matching `cron.schedule(...)` block from
  [`supabase/cron.sql`](../supabase/cron.sql) with a new UTC time.
  IST = UTC + 5:30 → 7:00 IST is `30 1 * * *`.

## How it works (1 paragraph)

Next.js (App Router) on Vercel; all reads/writes go through server
actions using the Supabase service-role key — the browser never touches
the database directly. Auth is one shared PIN that sets a signed,
httpOnly cookie for a year. A Postgres trigger broadcasts an empty
realtime "ping" whenever orders change, and every open phone refetches —
so the board is live everywhere. New orders trigger an instant Web Push
from the server action; scheduled pushes and 3-day cleanup run as
Supabase Edge Functions on pg_cron.
