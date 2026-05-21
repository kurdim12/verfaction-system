-- Raw Smith verification system schema
-- Paste this in Supabase → SQL Editor → Run

-- ── customers ────────────────────────────────────────────────
create table if not exists public.customers (
  email             text primary key,
  first_name        text,
  last_name         text,
  current_points    integer default 0,
  membership_tier   text check (membership_tier in ('gold','silver','bronze')),
  visits            integer default 0,
  bonus_points      integer not null,
  redemption_code   text not null unique check (redemption_code ~ '^[0-9]{4}$'),
  redeemed_at       timestamptz,
  redeemed_by       text,
  status            text not null default 'pending'
                       check (status in ('pending','sent','failed','skipped')),
  resend_id         text,
  error_message     text,
  sent_at           timestamptz,
  imported_at       timestamptz not null default now()
);
create index if not exists customers_status_idx on public.customers (status);
create index if not exists customers_tier_idx on public.customers (membership_tier);
create index if not exists customers_redeemed_idx on public.customers (redeemed_at);

-- ── staff (4 baristas, each with own PIN) ────────────────────
create table if not exists public.staff (
  id          serial primary key,
  name        text not null unique,
  pin         text not null check (pin ~ '^[0-9]{4}$'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed the 4 baristas with starter PINs. Tell each one privately, rotate any time.
insert into public.staff (name, pin) values
  ('Obaida',  '1024'),
  ('Muneeb',  '3712'),
  ('Samahar', '5946'),
  ('Ahmed',   '8273')
on conflict (name) do nothing;

-- ── audit_log (append-only) ──────────────────────────────────
create table if not exists public.audit_log (
  id              bigserial primary key,
  occurred_at     timestamptz not null default now(),
  action          text not null,
  actor           text,
  redemption_code text,
  customer_email  text,
  metadata        jsonb,
  ip_address      text
);
create index if not exists audit_occurred_idx on public.audit_log (occurred_at desc);
create index if not exists audit_action_idx on public.audit_log (action);
create index if not exists audit_actor_idx on public.audit_log (actor);
create index if not exists audit_code_idx on public.audit_log (redemption_code);

-- ── Convenience views ───────────────────────────────────────
create or replace view public.v_redemption_stats as
  select
    count(*) filter (where redeemed_at is not null)              as redeemed,
    count(*) filter (where status = 'sent' and redeemed_at is null) as unredeemed,
    count(*)                                                     as total,
    count(*) filter (where status = 'sent')                      as sent,
    count(*) filter (where status = 'pending')                   as pending,
    count(*) filter (where status = 'failed')                    as failed
  from public.customers;

create or replace view public.v_per_barista_today as
  select redeemed_by as barista, count(*) as redemptions_today
  from public.customers
  where redeemed_at >= current_date and redeemed_by is not null
  group by redeemed_by;

-- ── RLS off (we use service_role from the server) ────────────
alter table public.customers disable row level security;
alter table public.staff     disable row level security;
alter table public.audit_log disable row level security;
