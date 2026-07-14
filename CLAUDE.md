# PalletTrack — Pending Orders Board

## Agent Context & Build Spec

---

## DEVELOPMENT (as built)

```sh
npm run dev      # local dev server (needs .env.local — copy .env.example)
npm run build    # production build + type check (must stay green)
npm run lint     # eslint (react-hooks compiler rules are strict — keep clean)
npm run icons    # regenerate public/icons/*.png from scripts/generate-icons.mjs
```

No test suite — verification is real-device QA (see Phase 6 below).

### As-built notes (where implementation differs from / refines the spec)

- **Next.js 16** (App Router, Turbopack). The route guard lives in
  `proxy.ts` (Next 16 renamed the `middleware.ts` convention to proxy).
- Auth cookie: HMAC-SHA256-signed expiry via Web Crypto (`lib/auth.ts`),
  works in both proxy (edge) and server actions.
- Realtime: a Postgres **statement trigger** on `orders` calls
  `realtime.send()` on the public `orders-ping` broadcast channel; the
  client (`components/Board.tsx`) listens with the anon key and calls
  `router.refresh()`. No order data flows through the channel. Fallbacks:
  refetch on visibilitychange + 30s poll. RLS is enabled with **no
  policies** on both tables — only the service-role key can touch them.
- Storage buckets are **public-read** (UUID filenames, files live ≤ ~2
  weeks); all writes go through server actions.
- `orders.voice_duration` (seconds) was added to the spec schema —
  captured client-side while recording, avoids the Chrome webm
  Infinity-duration bug at playback.
- Scheduled work = two edge functions (`send-reminders`,
  `cleanup-dispatched`), deployed `--no-verify-jwt`, protected by an
  `x-cron-secret` header (CRON_SECRET secret), invoked by pg_cron +
  pg_net (`supabase/cron.sql`).
- Edge push uses `npm:@block65/webcrypto-web-push@1` — Node's `web-push`
  does NOT bundle on the edge runtime (deploy reports ACTIVE but the
  router 404s). The Next.js server actions still use `web-push` (Node).
- `supabase/functions/` is Deno code — excluded from tsconfig; don't
  import it from app code.
- Design system: kraft-paper/stencil "shipping tag" theme, tokens in
  `app/globals.css` (`@theme`: kraft/card/ink/stamp/go colors, and
  `.tag-card`, `.press`, `.stencil`, `.stamp` utilities). Fonts: Saira
  Stencil One (display numbers) + Archivo (body) via next/font.
- ALL user-facing copy lives in `lib/strings.ts` — never hardcode strings
  in components.

---

## PROJECT OVERVIEW

### One-liner
A dead-simple, mobile-first PWA for a wooden pallet manufacturing company:
a single shared board of all PENDING orders. The 1–2 order heads post a
photo/screenshot of each new order; the ~6-person production team sees it
instantly, manufactures it, and taps "DISPATCHED". Replaces a WhatsApp
group where old order photos get buried under new ones and orders get
forgotten.

### What this app is NOT
- NOT a permanent order database (they have Tally/Excel for that)
- NOT an analytics/reporting tool
- NOT a multi-status workflow system — only PENDING and DISPATCHED exist

### Users
~8 people total. One shared team, no roles — everyone can add orders and
mark them dispatched. Several users barely know how to use a smartphone.

### THE GOLDEN RULE
SIMPLICITY BEATS EVERYTHING. One screen. Huge buttons. Big text. No
gestures that need discovering. No feature that isn't in this spec.
Whenever a design or implementation choice arises, pick the option that
a 55-year-old non-tech factory worker can use without being taught.

---

## TECH STACK

- Framework: Next.js (latest stable, App Router) + Tailwind CSS
- Backend: Supabase — Postgres + Storage + Realtime + Edge Functions + pg_cron
- Hosting: Vercel
- PWA: web app manifest + custom service worker (required for push anyway)
- Push notifications: Web Push with VAPID keys (`web-push` npm library)
- Voice recording: browser MediaRecorder API
- No component library needed — the UI is a handful of big buttons and
  cards. Plain Tailwind is enough.

### Architecture principle
ALL database and storage access goes through Next.js server actions /
route handlers using the Supabase SERVICE ROLE key. There is no Supabase
Auth, no RLS policies exposed to clients, no client-side Supabase writes.
The client only:
  1. Calls server actions (create order, dispatch, undo, subscribe to push)
  2. Holds a read-only Realtime subscription for live board updates
     (use the anon key with RLS allowing SELECT only, or poll/refetch on
     a Realtime broadcast — pick whichever is simpler and secure)

---

## AUTH — SHARED PIN

- One shared 4–6 digit PIN for the entire team. Stored server-side as
  env var `APP_PIN`. No accounts, no emails, no passwords.
- First open: a single full-screen PIN entry — huge custom keypad.
  As-built (client request 2026-07-14): NO enter button — the pad
  auto-submits when the PIN length is reached (the pin page passes
  `APP_PIN.length` to the client; acceptable leak for a shared PIN).
- Correct PIN → set a signed, httpOnly cookie valid ~1 year. The user
  never sees the PIN screen again on that phone.
- Every server action and page load verifies the cookie server-side.
  Wrong/missing cookie → redirect to PIN screen.
- Rate-limit PIN attempts (e.g. small delay after failures) so the PIN
  can't be brute-forced.

---

## DATABASE SCHEMA

```sql
-- Table: orders
id             uuid primary key default gen_random_uuid()
order_no       integer generated by a dedicated sequence, unique
               -- starts at 1, increments forever, NEVER resets
order_date     date not null default current_date  -- auto, no user input
customer_name  text                                 -- optional
photo_url      text not null    -- the photo IS the order
voice_url      text             -- optional voice note
voice_duration integer          -- seconds (as-built addition, see above)
status         text not null default 'pending'
               check (status in ('pending','dispatched'))
dispatched_at  timestamptz      -- set when dispatched, cleared on undo
created_at     timestamptz not null default now()

-- Table: push_subscriptions
id           uuid primary key default gen_random_uuid()
endpoint     text unique not null
keys         jsonb not null      -- { p256dh, auth }
device_label text                -- optional, e.g. "Ramesh's phone"
created_at   timestamptz not null default now()
```

### Storage buckets
- `order-photos` — one image per order
- `order-voices` — one audio file per order (webm/mp4 from MediaRecorder)

Compress/resize photos client-side before upload (max ~1600px long edge,
JPEG ~80%) so uploads are fast on factory-floor mobile data.

### Auto-cleanup (pg_cron)
Daily job: find orders where `status = 'dispatched'` and
`dispatched_at < now() - interval '3 days'` → delete their photo and
voice files from Storage, then delete the rows. Nothing is kept forever.

---

## THE ONE SCREEN (/)

### Header
- App name (small) + giant pending count: **"7 PENDING"**
- A small bell icon/button showing notification status (see Push section)

### Pending orders list (newest first)
Each order card — large, one per row, impossible to mis-tap:
- Big photo thumbnail (~40% of card). Tap → full-screen photo viewer
  with pinch-zoom and a big ✕ close button.
- **Order #** displayed BIG (this is how they'll refer to orders verbally)
- Order date (e.g. "13 Jul")
- Customer name if provided
- If voice note exists: a big obvious ▶ PLAY button with duration.
  Playing shows a simple progress bar. Only plain tap controls.
- Big green **"DISPATCHED ✓"** button spanning the card bottom.
  Tap → simple confirm dialog ("Mark order #123 dispatched?") →
  status = dispatched, dispatched_at = now.

### Recently Dispatched (bottom, collapsed by default)
- Collapsed row: "Recently dispatched (3) ▸" — tap to expand.
- Shows dispatched orders from the last 3 days, grayed out, each with
  an **UNDO** button that returns the order to pending (clears
  dispatched_at). This is the safety net for wrong taps.
- After 3 days they are deleted automatically by the cleanup job.

### Add button
- Giant **"+ NEW ORDER"** button, fixed at the bottom, full-width,
  min height 64px. Always visible.

### Realtime
- The board updates live on every phone when any order is added,
  dispatched, or undone — no refresh needed. Supabase Realtime on the
  `orders` table (or a broadcast channel triggering refetch).
- Also refetch on window focus/visibility change as a fallback.

### Empty state
- When 0 pending: a big friendly "✓ No pending orders" — clearly good
  news, not an error.

---

## ADD ORDER FLOW (must take under 10 seconds)

Tap "+ NEW ORDER" → one simple full-screen form:

1. **Photo (REQUIRED)** — picker opens immediately on entering the form.
   `<input type="file" accept="image/*">` so the phone offers
   Camera / Gallery natively. Show a large inline preview once chosen,
   with a "Change photo" button. Cannot save without a photo.
2. **Customer name (optional)** — one plain text field, skippable.
3. **Voice note (optional)** — big "🎤 Record voice note" button.
   Tap to record (MediaRecorder), tap to stop. Show duration while
   recording. After: play-back preview + "Delete & re-record" option.
4. Giant **"SAVE ORDER"** button. Disabled until photo is attached.
   Show clear uploading progress; on success return to the board where
   the new order is visible at top.

Order number and order date are assigned automatically server-side.
There are NO other fields. No due dates, no dimensions, no quantities,
no descriptions, no categories, no statuses to choose.

---

## PUSH NOTIFICATIONS — THE KEY FEATURE (non-negotiable)

Three notification behaviors, delivered via Web Push to every
subscribed device:

1. **New order (instant):** the moment an order is saved, the server
   action sends a push to ALL subscriptions:
   "🪵 New order #123 — Ramesh Traders" (customer name if present).
   Tapping the notification opens the app.
2. **Morning summary (7:00 AM IST daily):** "5 orders pending" —
   the daily kick for the production team.
3. **Repeat reminders (every ~6 hours):** same pending summary at
   13:00 and 19:00 IST. (So the full schedule is 7:00, 13:00, 19:00
   IST — the 7 AM one is simply the first of the day.)
   Skip sending entirely when 0 orders are pending.

### Implementation
- Generate VAPID key pair; public key exposed to client, private key
  server-side only.
- **Subscribe flow:** after PIN entry, show a big, unmissable
  "🔔 TURN ON NOTIFICATIONS" button/banner. Tap → Notification
  permission prompt → save PushSubscription (endpoint + keys) via
  server action into `push_subscriptions`. Banner stays until
  subscribed. Handle "denied" with a short plain-language help text.
- **New-order push:** sent directly from the create-order server action
  (loop over all subscriptions with `web-push`).
- **Scheduled pushes:** Supabase Edge Function `send-reminders` reads
  the pending count and sends the summary push to all subscriptions.
  Scheduled by pg_cron at **01:30, 07:30, 13:30 UTC** (= 7:00, 13:00,
  19:00 IST). Store the VAPID private key as an Edge Function secret.
- **Housekeeping:** any push that returns 404/410 → delete that
  subscription row.
- **Service worker:** handles `push` (show notification) and
  `notificationclick` (focus/open the app).

### iOS caveat (must be documented in README)
On iPhone, web push ONLY works after the app is installed to the Home
Screen (iOS 16.4+), and the permission prompt must come from a user
tap. Android works in the normal browser too, but everyone should
install the app regardless. README must include a dead-simple install
guide for both platforms, written so it can be forwarded to the team
on WhatsApp:
- iPhone: Safari → Share → "Add to Home Screen" → open from icon →
  tap "Turn on notifications"
- Android: Chrome → "Install app" prompt (or ⋮ → Add to Home screen) →
  open → tap "Turn on notifications"

---

## PWA REQUIREMENTS

- `manifest.json`: app name, short_name, icons (192/512 + maskable),
  `display: standalone`, theme + background color.
- Service worker: push handling as above + basic app-shell caching so
  the app opens fast. Cached shell + "you're offline" notice is
  enough — full offline mode is NOT required.
- Passes installability checks on Android Chrome and iOS Safari.

---

## DESIGN RULES

- Mobile-first at 390px width. This app will essentially never be used
  on desktop — a centered ~480px column on big screens is fine.
- Tap targets: minimum 56×56px (bigger than the usual 44px — the users
  are non-tech and often working with rough hands).
- Base font 18px+. Order numbers and the pending count displayed BIG.
- High contrast everywhere. No subtle grays, no low-contrast labels.
  Pending = one strong obvious color; DISPATCHED button = unmistakable
  green; UNDO = clearly secondary.
- Plain buttons and plain screens only. NO bottom sheets, NO swipe
  gestures, NO long-press actions, NO hidden menus.
- Every destructive/confusable action gets a simple confirm dialog with
  two big buttons ("YES, DISPATCHED" / "NO, GO BACK").
- Loading and success states must be obvious (spinners, "Order saved ✓").
- Zero horizontal scroll. No pagination. No dark mode. No settings page.
- Language: English labels for v1, but keep ALL user-facing strings in
  one constants file so switching to Hindi/Gujarati (or bilingual
  labels) later is a 10-minute job.

---

## PROJECT STRUCTURE

```
/app                  Next.js App Router (pin page, board page, add page)
/components           OrderCard, DispatchedCard, AddOrderForm,
                      VoiceRecorder, VoicePlayer, PhotoViewer,
                      NotifyBanner, ConfirmDialog, PinPad, Board,
                      RegisterSW
/lib                  supabase server client, web-push helper,
                      auth (PIN cookie) helpers, strings.ts (all copy),
                      compress.ts, format.ts
/public               manifest.json, icons, service worker (sw.js)
/scripts              generate-icons.mjs
/supabase             schema.sql, cron.sql,
                      functions/send-reminders, functions/cleanup-dispatched
proxy.ts              route guard (Next 16 middleware convention)
```

---

## ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY      # only used for the realtime ping channel
SUPABASE_SERVICE_ROLE_KEY          # server-side only
APP_PIN                            # the shared team PIN
AUTH_COOKIE_SECRET                 # for signing the auth cookie
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY                  # server + edge function secret
```

`.env.example` lists all of these with comments. Edge functions
additionally need secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
CRON_SECRET.

---

## BUILD ORDER

Phase 1 — Setup ✅
  Next.js + Tailwind scaffold, Supabase schema + sequence + buckets,
  PIN gate (page, cookie, server-side guard), .env.example

Phase 2 — Board + Add Order ✅
  The single board screen, order cards, photo upload (with client-side
  compression), full-screen photo viewer, add-order flow, Realtime
  live updates, empty state

Phase 3 — Dispatch flow ✅
  DISPATCHED button + confirm, Recently Dispatched section + UNDO,
  pg_cron auto-cleanup job (rows + storage files)

Phase 4 — Voice notes ✅
  MediaRecorder recording UI, upload to order-voices, playback on card

Phase 5 — PWA + Push (the key phase) ✅
  Manifest + icons + service worker, install flow, subscribe banner,
  new-order instant push, send-reminders edge function + pg_cron
  schedules, dead-subscription pruning, iOS/Android install README.
  Supabase side provisioned 2026-07-14 (schema, buckets, triggers,
  both edge functions, 4 cron jobs, security hardening).
  REMAINING (dashboard-only, MCP can't do these): copy service_role
  key into .env.local + Vercel; set edge function secrets
  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / CRON_SECRET.

Phase 6 — Polish + real-phone QA ⏳
  Test on one real Android and one real iPhone, BOTH installed to
  Home Screen. Verify end-to-end: PIN once → add order with photo +
  voice → instant push arrives on the other phone → dispatch + undo →
  scheduled reminder push arrives → dispatched order auto-deletes
  after 3 days.

---

## README MUST INCLUDE

1. Supabase setup: schema SQL, storage buckets, edge function deploy,
   pg_cron schedule SQL, where to put secrets
2. How to generate VAPID keys
3. Vercel deploy steps + env vars
4. The team-facing install guide (iPhone + Android, with the
   notifications step) — written simply enough to forward on WhatsApp
5. How to change the PIN and the reminder times

---

## CRITICAL REMINDERS

- Push notifications are the reason this app exists over WhatsApp.
  Phase 5 is not optional polish — verify it on REAL devices.
- Photo is required; everything else optional. Order # and date are
  automatic. If you find yourself adding a field, stop — re-read the
  golden rule.
- Dispatched ≠ archived: it means "gone in 3 days". This app never
  accumulates data.
- Order numbers come from a Postgres sequence that cycles 1..1000 (wraps
  back to 1 after 1000; client decision 2026-07-14). `npm run reset-orders`
  wipes everything and restarts numbering at 1.
- Keep every user-facing string in `lib/strings.ts` for easy
  translation later.

## OPEN ITEMS (confirm with client, defaults chosen)

- Reminder times default to 7:00 / 13:00 / 19:00 IST — adjust to real
  shift hours if told.
- UI language defaults to English — switch to Hindi/Gujarati bilingual
  if the team prefers.
- ~~Order numbers never reset~~ RESOLVED 2026-07-14: client chose
  1..1000 cycling (sequence `maxvalue 1000 cycle`).
