-- PalletTrack schema. Run in the Supabase SQL editor (or via MCP).

-- Order numbers come from a dedicated sequence: start at 1, never reset.
create sequence if not exists public.order_no_seq start 1;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       integer not null unique default nextval('public.order_no_seq'),
  order_date     date not null default current_date,
  customer_name  text,
  photo_url      text not null,
  voice_url      text,
  voice_duration integer, -- seconds, captured while recording
  status         text not null default 'pending'
                 check (status in ('pending', 'dispatched')),
  dispatched_at  timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text unique not null,
  keys         jsonb not null, -- { p256dh, auth }
  device_label text,
  created_at   timestamptz not null default now()
);

-- Lock both tables down. Only the service-role key (server) touches them;
-- with RLS on and no policies, the anon key can read/write nothing.
alter table public.orders enable row level security;
alter table public.push_subscriptions enable row level security;

-- Realtime "ping": any change to orders broadcasts an empty message on
-- the public 'orders-ping' channel. Clients hear it and refetch through
-- the server — no order data ever flows through the anon channel.
create or replace function public.notify_orders_changed()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', 'orders-ping', false);
  return null;
end;
$$;

drop trigger if exists orders_changed on public.orders;
create trigger orders_changed
  after insert or update or delete on public.orders
  for each statement execute function public.notify_orders_changed();

-- Storage buckets. Public read: file names are unguessable UUIDs and
-- files live at most ~2 weeks. All writes go through the server.
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('order-voices', 'order-voices', true)
on conflict (id) do nothing;
