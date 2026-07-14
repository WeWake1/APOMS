# PalletTrack 🪵

**One shared board of pending orders for a wooden pallet factory — every
order is a photo, every phone gets pinged, and nothing gets forgotten.**

## The problem

A large wooden pallet manufacturer runs its production the way most
factories actually do: an order comes in, someone photographs the order
sheet or screenshots the message, and drops it into a WhatsApp group for
the production team.

It works — until it doesn't. New photos push old ones up and out of
sight. Nobody knows at a glance how many orders are still open. There's
no way to mark an order "done" that everyone can see. Orders get buried,
get made twice, or get forgotten entirely, and the only fix is scrolling
back through days of chat asking *"did we dispatch this one?"*

The team already had Tally and Excel for record-keeping. What they were
missing was much simpler: a live answer to the question **"what still
needs to be made, right now?"**

## The product

PalletTrack is a mobile-first web app (PWA) that replaces that WhatsApp
group with a single screen:

- **A shared pending board.** Every open order is a card — a big photo
  of the order, a large order number the team can shout across the
  factory floor, the date, and optionally a customer name and a voice
  note with extra instructions. A giant counter at the top says exactly
  how many orders are pending.
- **Posting an order takes under 10 seconds.** Tap **+ NEW ORDER**, snap
  or pick a photo, save. The photo *is* the order — no forms, no data
  entry. Order numbers and dates are assigned automatically.
- **Everyone knows instantly.** The moment an order is posted, every
  phone on the team gets a push notification. Scheduled reminders at
  7:00, 13:00, and 19:00 repeat the pending count so nothing sits
  unnoticed through a shift.
- **Done means done — visibly.** When an order ships, anyone taps the
  big green **DISPATCHED ✓** button and it leaves the board on every
  phone at once, live, no refresh. A mis-tap is fixed with one **UNDO**
  from the "Recently dispatched" list.
- **It cleans up after itself.** Dispatched orders (and their photos and
  voice notes) are deleted automatically after 3 days. PalletTrack is
  deliberately not an archive — the books stay in Tally; this board only
  ever shows what matters *today*.

## Why it works

The whole design is governed by one rule: **a 55-year-old factory worker
who barely uses a smartphone must be able to use it without being
taught.**

That rule shaped everything:

- **One screen.** No menus, no settings, no navigation to learn.
- **One login, ever.** A shared team PIN, entered once per phone. No
  accounts, no passwords, no "forgot password".
- **Huge everything.** Oversized buttons, big type, high contrast, plain
  taps only — no swipes, long-presses, or hidden gestures.
- **Two states, not a workflow.** An order is *pending* or it's
  *dispatched*. There is nothing else to understand.
- **Installs like an app.** Added to the home screen once, it opens
  from an icon and pings like any native app — no app store, no updates
  to manage.

## The impact

For a company moving serious production volume, the change is simple but
structural: the production team went from *scrolling a chat and hoping*
to *glancing at one number and one list*. Order heads post an order and
know the floor has seen it. The floor starts each day with the morning
summary and closes each order with one green tap that the whole team
witnesses in real time.

No order buried. No order made twice. No order forgotten.

## Under the hood (briefly)

Next.js on Vercel, with Supabase providing the database, photo/voice
storage, live updates, and scheduled jobs. Instant and scheduled Web
Push notifications, a service worker for installability, and all data
access locked behind the server — phones only ever talk to the app, not
the database. Dispatched orders self-destruct on a daily cleanup job.

Deployment, configuration, and the team install guide live in
[docs/SETUP.md](docs/SETUP.md).
