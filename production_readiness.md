# Production Readiness Checklist

Status snapshot as of this writing. Update as items are completed.

---

## P0 — Blocking

Nothing in production should launch until these are done.

- [ ] **Carrier integrations are fully mocked.** All 5 adapters (`fedex`, `xpo`, `dayross`, `manitoulin`, `polaris`) return simulated rates. No live API calls exist yet.
  - [ ] Day & Ross first — account #197742 already approved, REST API live since March 2026.
  - [ ] FedEx — see FedEx Integrator section below; rates *and* Account Registration both need real API wiring.
  - [ ] XPO, Manitoulin, Polaris — obtain API credentials and implement adapters.
- [ ] **PIN logging leak.** `backend/src/services/fedexAccount.service.js` logs the real verification PIN to the server console (`[DEV FEDEX PIN] ...`). Remove or gate behind a dev-only env check before this touches production traffic.
- [ ] **Database is local-only.** Move off local Postgres to a hosted provider (Neon/Supabase/Railway — see `CLAUDE.md` for tradeoffs) and run migrations against it.
- [ ] **Backend/frontend hosting.** Deploy backend (Railway recommended — runs the Express app as-is) and frontend (Vercel). `frontend/lib/api.js` currently hardcodes `http://localhost:4000`.
- [ ] **Secrets management.** DB URL, JWT secret, and carrier API keys need real production secrets storage — not a local `.env` file.

---

## P1 — Blocking for FedEx Integrator certification specifically

Required before FedEx will validate/certify the integration, separate from general prod-readiness.

- [ ] Replace the placeholder EULA text in `frontend/lib/fedexCompliance.js` with FedEx's actual End User License Agreement (Distributed Product) text from the FedEx Developer Portal. Currently marked as placeholder in code.
- [ ] Confirm `frontend/public/carrier-logos/fedex.svg` is genuinely sourced from FedEx's brand portal (`brand.fedex.com/portals/fedex-external`), not just visually plausible — verify provenance before customer-facing use or validation submission.
- [ ] Source official logos for XPO, Day & Ross, Manitoulin, Polaris the same way (no hand-drawn/traced assets).
- [ ] Implement the real Account Registration API call — `child_key`/`child_secret` currently generated locally instead of returned by FedEx; PIN/invoice validation currently done in-house instead of by FedEx systems.
- [ ] Run FedEx's Integrator test case spreadsheet for the target territory/territories.
- [ ] Submit JSON transactions for all four Factor 2 methods (SMS, call, email, invoice).
- [ ] Generate, print, and scan labels in all three required formats (PDF, PNG, ZPL); package as `.zip` for submission.
- [ ] Complete and submit the FedEx Integrator Validation Cover Sheet.

---

## P2 — Missing data model pieces

Already flagged as gaps in `CLAUDE.md`; needed for a functioning production billing/compliance flow.

- [ ] Stripe customer ID / payment intent ID storage (no real payment processing yet)
- [ ] Email verification status on User
- [ ] Password reset tokens
- [ ] Audit log (who did what, when)
- [ ] Rate cache table

---

## P3 — Should do before launch, not strictly blocking

- [ ] Automated test coverage — none exists currently.
- [ ] Decide deliberately on JWT storage strategy (currently `localStorage`; consider httpOnly cookies) rather than keeping the dev default.
- [ ] Restrict CORS to production origins — currently open for localhost only.
- [ ] Rate limiting and an input-validation audit pass on public endpoints.
- [ ] Structured logging / monitoring in production (current logging is console-only, dev-oriented).

---

## Suggested order of attack

1. Fix the PIN-logging leak (small, fast, real security issue).
2. Stand up hosted Postgres + deploy backend/frontend skeletons (unblocks everything else being tested against a real environment).
3. Wire up Day & Ross live rates (closest to ready) as the first real carrier integration.
4. Work FedEx Integrator certification track in parallel (EULA text, logo provenance, Account Registration API, test cases) since it has its own external approval timeline.
5. Fill in P2 data model gaps as billing/production usage actually requires them.
6. P3 hardening before or shortly after first real customer traffic.
