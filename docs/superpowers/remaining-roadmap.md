# Finders Keepers — remaining roadmap & fresh-session handoff

**Date:** 2026-06-15 (Stripe checkout verified locally)
**Purpose:** Deploy checklist and post-launch ops.

---

## Current state (done, pending commit → deploy)

All product phases through **Phase 8** plus **live Stripe checkout** (test mode):

- Operator console, storage uploads, messaging, account, legal, CI/hardening.
- **Stripe:** hosted Checkout, webhook confirmation, resume + success-page sync.
- **86 Vitest tests**, all green.

Local smoke test passed: post → fund → Stripe → webhook → sourcing.

---

## Deploy checklist (manual)

1. **Commit + push** `main` (Stripe hardening from local testing).
2. **Vercel** — import repo; set env vars from `.env.example`:
   - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → production URL (e.g. `https://your-app.vercel.app`)
   - `ESCROW_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. **Production Supabase** — apply migrations `0001`–`0004`.
4. **Stripe Dashboard** — add webhook endpoint
   `https://YOUR-DOMAIN/api/stripe/webhook` (events:
   `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`).
5. **Staff** — set `is_staff = true` on operator profile(s) in Supabase.
6. **Optional:** `npm run seed` on production for demo data (uses stub escrow).

---

## "Finished app" definition of done

Migrations on prod DB; CI green on `main`; deployed to Vercel; Stripe webhook
returns 200; end-to-end walkthrough works; five non-negotiable constraints hold.
