# MEHFIL - Loyalty & Rewards (मेहफिल)

Production-ready, mobile-first loyalty and rewards web app for the shop **MEHFIL (मेहफिल)**.

> Every Visit. Every Sip. Every Reward.

- ☕ 8 Chai → 1 Bun Maska FREE
- 🍜 8 Maggie → 1 Free Maggie
- 🏪 5 eligible visits (₹15+ each) → 1 Chai FREE

Zero-cost design: no payment gateway, no OTP/SMS, no paid auth/analytics. Customers pay at the shop via existing UPI; the site only tracks loyalty, verifies purchases, and redeems rewards.

## Features

- Email + password auth (bcrypt-hashed, HTTP-only cookie sessions, server-side role checks)
- User dashboard with Chai / Maggie / Visits progress, rewards, recent activity
- Purchase request flow (PENDING → admin APPROVE/REJECT), one-tap admin approval
- Central loyalty engine (`lib/loyalty/`): one purchase can count for Chai/Maggie **and** visits; ₹15 threshold; max 1 visit per purchase; reward cycles reset (8→0, 5→0); 16 Chai = 2 rewards
- Reward claim → secure one-time QR (`MEHFIL-RWD-…`) → admin camera scan → one-time redeem
- Admin: stats, pending queue, users + detail, rewards, QR scanner, audit log
- Duplicate-approval protection (transactional `updateMany where PENDING`), idempotent rewards
- Rate limiting (login + signup + purchases), zod validation, generic error messages
- Mobile-first Tailwind UI, bottom nav, toasts, loading + empty states
- Tests (vitest) for chai/maggie/visit cycles + security rules

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Neon PostgreSQL + Prisma 6
- bcryptjs (bcrypt acceptable per spec; Argon2id impractical on serverless/Windows without native build)
- `react-qr-code` (QR display), `html5-qrcode` (camera scan), `zod`

## Folder Structure

```
app/                  # routes (user + admin + api)
  page.tsx            # landing
  login/ signup/ dashboard/ rewards/ activity/ purchases/ profile/
  admin/ login/ purchases/ users/ rewards/ scanner/ audit/
  api/ auth/ purchases/ user/ rewards/ admin/
components/           # ui.tsx, nav.tsx, qr-display.tsx, qr-scanner.tsx
lib/                  # db.ts, auth.ts, password.ts, tokens.ts, validation.ts, rate-limit.ts
  loyalty/            # config.ts, engine.ts (centralized business rules)
prisma/               # schema.prisma, seed.ts
scripts/              # create-admin.ts
tests/                # loyalty.test.ts, security.test.ts
```

## Local Development

1. Copy env:
   ```bash
   cp .env.example .env
   ```
2. Install:
   ```bash
   npm install
   ```
3. Add your Neon `DATABASE_URL` to `.env` (see Neon Setup below).
4. Migrate + generate:
   ```bash
   npx prisma migrate dev
   ```
5. (Dev only) seed demo data:
   ```bash
   npm run db:seed
    # admin: mehfil / MehfilAdmin123!
    # users: himanshu@example.com / DemoUser123!, rahul@example.com / DemoUser123!
   ```
6. Run:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Scan-shop QR = your deployed URL.

## Neon Setup

1. Create a free Neon project → copy the pooled `DATABASE_URL`.
2. Paste it into `.env` as `DATABASE_URL="postgresql://…"`.
3. Also set `ADMIN_SETUP_SECRET` (see `.env.example`). `NEXT_PUBLIC_APP_URL` is optional (deployed URL for shop QR/links).
4. Run `npx prisma migrate dev` locally, or `npx prisma migrate deploy` in production.
5. Never commit `.env`. Never expose `DATABASE_URL` to the client.

## Environment Variables

See `.env.example`:

- `DATABASE_URL` - Neon Postgres connection (server-only)
- `ADMIN_SETUP_SECRET` - required to run `create-admin` when set
- `NEXT_PUBLIC_APP_URL` - optional public URL of the deployed app

## Database Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Production:

```bash
npx prisma migrate deploy
```

## Seed Data

Dev only: `npm run db:seed`. Do NOT run in production. Demo credentials are clearly marked and must never be deployed.

## Admin Creation

Secure, no hardcoded credentials:

```bash
npm run create-admin
# or non-interactive (confirmation secret passed separately so it never
# appears as the required secret itself):
ADMIN_USERNAME=owner ADMIN_PASSWORD='long-random-pass' ADMIN_SETUP_SECRET_INPUT=... npm run create-admin
# alternative: npm run create-admin -- --secret ...
```

Promotes existing user to ADMIN or creates a new ADMIN + loyalty row.

## Running the App

- `npm run dev` - local
- `npm run build && npm start` - production
- `npm test` - vitest loyalty + security tests
- `npm run lint` - eslint

Deploy anywhere Next.js runs (Vercel/Render/Fly free tiers). Set env vars in the host dashboard.

## Security

- bcrypt password hashes (`password_hash`), never plaintext, never sent to client
- DB-backed sessions, HTTP-only `SameSite=Lax`, `Secure` in prod, 30-day expiry
- Role checks server-side on every admin API + page fetch; users can only access own data
- Prisma parameterized queries; zod validation; generic 500 messages with server logs
- Rate limits: 10 logins/10min, 10 signups/hour per IP, 20 purchases/hour
- Secure `crypto.randomBytes` redemption tokens; QR contains only the token
- No secrets in frontend, no localStorage auth, DB is source of truth (works after cache clear, multi-device)

### Loyalty consumption note

Reward cycles are consumed at **approval time** (when the threshold is reached, counter resets and an `AVAILABLE` reward is created). Redemption (`CLAIMED → REDEEMED`) is one-time and does not touch counters again. This guarantees 16 Chai = 2 rewards even if the user hasn't redeemed the first yet, and prevents duplicate rewards. The audit log records both approval and redemption.

## Troubleshooting

- `P1001 can't reach DB` → check Neon URL, IP allow-list, `?sslmode=require`.
- Prisma Client not generated → `npx prisma generate`.
- Camera scan fails → use manual token paste; ensure HTTPS (camera requires secure context).
- Admin 403 → login via `/admin/login` with an ADMIN-role account created by `create-admin`.
- Double-click approve → safe: second call returns “Purchase already processed.”
