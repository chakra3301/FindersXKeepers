# Finders Keepers — remaining roadmap & fresh-session handoff

**Date:** 2026-06-14 (updated after Phase 8)
**Purpose:** Handoff for deploy verification and post-launch ops.

---

## Current state (done, on `main`)

All planned product phases through **Phase 8 (hardening)** are implemented:

- Plans 1–2, Phase 1 (Stripe escrow + cap refund), Phases 2–7 (operator console,
  storage uploads, messaging, account writes, legal pages).
- **Phase 8:** GitHub Actions CI, 404/error pages, create-request rate limit,
  README deploy guide.
- **82 Vitest tests**, all green without Stripe keys.

---

## Remaining operator/manual steps (no code)

1. **Vercel deploy** — import repo, set env vars (see `README.md` → Deploy).
2. **Production Supabase** — apply migrations `0001`–`0004`; run seed or create
   staff users.
3. **Stripe test-mode smoke test** — `docs/stripe-setup.md` (optional until
   going live with real checkout).
4. **Full lifecycle click-through** on production: post → fund → operator hops
   → approve → ship → release, with uploads + messaging.

---

## "Finished app" definition of done

Migrations applied on prod DB; CI green on `main`; deployed to Vercel; end-to-end
walkthrough works; five non-negotiable constraints hold throughout.
