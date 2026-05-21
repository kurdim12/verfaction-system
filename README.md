# Raw Smith — Verification System

One-time loyalty migration: 4-digit redemption codes, bilingual emails, staff redemption dashboard with full audit log.

## Stack

- Next.js 16 (App Router) + React 19
- Supabase (Postgres) — the only data store
- Resend — email delivery
- Vercel — hosting
- shadcn/ui + Tailwind v4

## Local dev

```bash
pnpm install
cp .env.example .env.local      # then fill in real values
pnpm dev                        # http://localhost:3000
```

## Database setup (run once)

In Supabase → SQL Editor, paste and run `supabase/schema.sql`. Creates:

- `customers` — the 150-ish migration customers
- `staff` — Obaida / Muneeb / Samahar / Ahmed with starter PINs (rotate immediately)
- `audit_log` — append-only log of every login, redemption, undo, lookup

## Load customers from CSV

```bash
pnpm load customers.csv         # parses, validates, mints 4-digit codes, inserts
pnpm status                     # totals + per-tier breakdown
```

## Send the bulk email

```bash
pnpm send --dry-run             # writes HTML to dry-run/, no Resend calls
pnpm send                       # prompts "type SEND", then 500ms between sends
pnpm send --tier gold           # filter
pnpm send --only abc@x.com      # send to one
pnpm send --retry-failed        # reset failed → pending and retry
```

`rawsmith.com` must be verified on Resend before live sends. The script hard-aborts
on the first 403 so you don't burn 150 attempts.

## Staff redemption (web app)

- `/staff` — barista picks their name, enters 4-digit PIN, types customer's 4-digit code → REDEEM
- `/admin` — stats, per-tier breakdown, per-barista today, audit log
- `/c/<code>` — public claim page linked from the email

Every action lands in `audit_log` with actor, code, customer, metadata, IP.

## CLI redemption (fallback if web is down)

```bash
pnpm redeem 4291                # mark redeemed (actor recorded as 'cli')
pnpm redeem 4291 --check        # show status, no change
pnpm redeem 4291 --undo         # un-redeem
```

## Skip / un-skip rows

```bash
pnpm skip abc@x.com def@y.com
pnpm skip abc@x.com --undo
```

## Email preview

```bash
pnpm preview-email              # 5 samples → email-preview/
pnpm test-send                  # one real send via Resend
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel → New Project → import the repo.
3. Add Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` ← server-only, no `NEXT_PUBLIC_` prefix
   - `SESSION_SECRET` (32+ random chars; `openssl rand -base64 32`)
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `REPLY_TO`
   - `NEXT_PUBLIC_SITE_URL` (set to the production URL after first deploy)
4. Deploy.
5. Optional custom domain: add `claim.rawsmith.com` in Vercel → Settings → Domains.

## Rotating PINs

```sql
update public.staff set pin = '9999' where name = 'Obaida';
```
