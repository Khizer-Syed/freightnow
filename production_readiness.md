# Production Readiness Checklist

Reconciled against `IFF Customer Portal Guide.md` — the client's own product spec — as of this
writing. That guide is now the authoritative source for what "done" means; this doc tracks status
against it, plus anything it doesn't cover.

**Read this first:** the guide describes an architecture that differs from what's currently built
in several places. All six of the open decisions below have now been made and are being rolled out
as a sequence of phases (see `.claude/plans/ethereal-squishing-cascade.md` for the phasing
rationale). Phase 1 is complete; this section tracks decision status, not just "still open."

---

## 0. Architecture decisions — status

- [x] **Database: MongoDB.** Decided. Not yet implemented — current build is still
  Postgres/Prisma; the Mongo migration is Phase 2, deliberately done *after* the data-model changes
  below so the model is only designed once. Local Mongo will be used until Khizer provides real
  connection credentials.
- [x] **Auth: Auth0.** Decided (over Firebase). Not yet implemented — current backend still hashes
  and stores passwords itself (`backend/src/services/auth.service.js`, `bcrypt` + `jsonwebtoken`).
  This is a later phase.
- [x] **Payments: QuickBooks**, not Stripe. Decided. Not yet implemented — scaffolding will happen
  without live credentials until a QuickBooks sandbox app is available.
- [x] **FedEx compliance flow: per the guide's simpler shape.** Decided — fold EULA acceptance +
  identity verification into signup itself, drop the per-customer FedEx account number
  requirement. Not yet implemented; today's fuller `FedexConnectModal.js` / Factor 1+2 flow is
  still what's live. This is its own later phase.
- [x] **Data model: `Booking` split from `Shipment`.** ✅ **Done** (Phase 1, see
  `phase1_booking_and_roles_changes.md`). A `Booking` record now exists distinct from `Shipment`,
  applied to the database and verified end-to-end.
- [x] **Four-tier roles vs. two.** ✅ **Done** (Phase 1). `customer` / `company_admin` /
  `iff_staff` / `iff_admin` now exist as real seeded fixtures with a `requireRole` middleware ready
  to use. Not yet *enforced* anywhere, because the staff/admin-only routes it would gate (spot-rate
  pricing, claims processing, markup rules) don't exist yet — see Step 8 below.
- [ ] **Money stored as decimals, not integer cents.** Still open, not part of Phase 1. The guide
  is explicit that money should be stored as whole cents (`$312.40` → `31240`) to avoid rounding
  drift across thousands of invoices. Current Prisma schema still uses `Float` for all money fields
  (now including the new `Booking.costRate`/`sellRate`). Worth fixing before real invoicing volume,
  and easiest to do now (Phase 1's new fields included) rather than after real financial history
  exists.

---

## 1. Status against the guide's own 9-step build order

**Step 1 — Foundations.** Not started: no hosting account/domain pointed at `iffcargo.com`
confirmed, no file storage service (checked — no S3/Cloudinary/multer references in the backend),
QuickBooks account, or Auth0/Firebase account. Local Postgres exists but its role is unresolved
per the architecture section above.

**Step 2 — Public site + accounts.** Mostly built: landing page, login, and the 3-step registration
flow (`frontend/app/register/page.js`) exist. Sign-in/session works against the current custom
auth. Whether the third signup step (agreements) matches the guide's design — recording FedEx EULA
acceptance with timestamp + IP address at signup — needs checking; today's EULA acceptance lives in
the separate FedEx-account-connection flow, not in registration.

**Step 3 — FedEx requirements + submit for approval.** Partially built, but see the architecture
note above — what exists doesn't match the guide's simpler shape. Known concrete issues, regardless
of which shape you land on:
- [ ] Placeholder EULA text in `frontend/lib/fedexCompliance.js` — marked as such in the code,
  needs the real FedEx EULA (Distributed Product) text from the FedEx Developer Portal.
- [ ] Verify `frontend/public/carrier-logos/fedex.svg` (and the other carrier logos) are genuinely
  sourced from each carrier's official brand assets before any customer-facing or FedEx-validation
  use.
- [ ] "Estimate, not final price" disclaimer on every quote — confirm this exists on all quote
  paths (spot requests included), not just the instant-price cards.
- [ ] Address validation before booking — not yet implemented; carriers are fully mocked.
- [ ] The submission itself (screenshots + test transactions to FedEx) hasn't happened — can't
  happen until the flow's final shape is settled.

**Step 4 — Quoting.** Structurally in place (`/portal/quote`) but running entirely on mocked
carrier data. Markup application: the guide explicitly flags that a prototype calculating markup
in the browser is a real problem ("must move before real customers use it") because anything sent
to the browser can be inspected, exposing your margin. Confirm the frontend's `applyMarkup()` is
only ever a demo fallback when the backend is unreachable, and that the live path always applies
markup server-side (`backend/src/services/markup.service.js`) before rates reach the client — this
needs verifying, not assuming. Markup rules living in an editable settings area (not hardcoded)
and per-company discount overrides are not yet built — `Company` has no discount/markup-override
fields today.

**Step 5 — Booking + payment.** The `Booking` entity now exists (Phase 1, done) and the "Book this
rate" button — previously a dead UI stub with no click handler — now actually calls
`POST /api/bookings` and creates a real `Booking` + `Shipment`. Still not built for real: no live
carrier booking calls (still mocked), no QuickBooks integration, no label/BOL generation (depends
on real carrier APIs).

**Step 6 — Post-booking.** Shipments list, tracking, and claims UI exist in the frontend
(`/portal/shipments`, `/portal/track`, `/portal/claims`) against mocked data. Automatic
transactional emails (booking confirmed, delivered, exception) — status unconfirmed; an
`email.service.js` exists but its current scope needs checking against what the guide asks for.

**Step 7 — Billing.** Invoice list/download UI exists (`/portal/billing`) against mocked data.
**Tax treatment is explicitly called out by the client as an open question requiring accountant
sign-off** — do not guess at Canadian freight tax rules; get that answered before building real
invoicing logic, not after.

**Step 8 — Admin tools.** Not started. No admin routes exist in the backend today (spot-rate
pricing queue, claims queue, markup-rule editor, customer discount settings, margin reporting are
all in the guide's Step 8 but have no corresponding backend routes yet). The role model and
`requireRole` gating mechanism are ready (Phase 1) — `// TODO` markers are already in
`spotRate.routes.js` and `claim.routes.js` for exactly where staff/admin gating goes once these
routes are built. The guide places this late deliberately but warns not to defer it indefinitely
once volume picks up.

**Step 9 — Remaining carriers.** All 5 carriers are currently mocked; none are "genuinely live"
per the guide's own done-criteria for this step. Day & Ross is closest (account #197742 approved,
API live since March 2026) and is the reasonable first real integration.

---

## 2. Known concrete issues (independent of the architecture questions above)

- [x] ~~Rate-quote API response never exposed a per-rate `id`, so there was no way to book a
  specific rate.~~ **Fixed in Phase 1.**
- [x] ~~"Book this rate" button had no click handler at all — dead UI stub.~~ **Fixed in Phase 1.**
- [ ] **Company-level data scoping.** Today, shipments/quotes/claims/spot-rates are all scoped by
  individual `userId`, not `companyId`, even though the guide's model has everyone at a company
  sharing visibility. Deliberately deferred out of Phase 1 (denormalized `companyId` was added to
  the new `Booking`/`Shipment` records so this is now a small, isolated follow-up) — recommended as
  the very next piece of work, not deferred indefinitely.
- [ ] **PIN logging leak.** `backend/src/services/fedexAccount.service.js` logs the real
  verification PIN to the server console (`[DEV FEDEX PIN] ...`). Needs removing or gating behind
  a dev-only env check regardless of how the FedEx flow's shape is ultimately resolved.
- [ ] Secrets management — DB URL, auth provider keys, carrier API keys, QuickBooks keys all need
  real production secrets storage, not a local `.env`.
- [ ] `frontend/lib/api.js` hardcodes `http://localhost:4000` — needs environment-based config
  before any real deployment.
- [ ] No automated test coverage exists.
- [ ] CORS currently open for localhost only.
- [ ] No rate limiting / input-validation audit has been done on public endpoints.

---

## 3. Suggested order of attack

1. ~~Resolve the architecture decisions in section 0~~ — **done**: MongoDB, Auth0, QuickBooks, the
   simplified FedEx flow, the Booking/Shipment split, and four-tier roles have all been decided.
2. ~~Data model: split `Booking` from `Shipment`; add four-tier roles~~ — **done (Phase 1)**, see
   `phase1_booking_and_roles_changes.md`.
3. **Next up — company-level data scoping** (small, isolated follow-up now that `companyId` is
   denormalized onto `Booking`/`Shipment`), then **Phase 2: the Mongo migration** — porting the
   now-settled schema (including Phase 1's changes) to MongoDB, against local/placeholder Mongo
   until Khizer provides real credentials.
4. Fix the PIN-logging leak — small, fast, real security issue, independent of the phased work
   above.
5. Get the tax-treatment question in front of an accountant now — it has its own lead time and
   blocks Step 7 regardless of engineering progress.
6. Phase 3: Auth0 swap. Phase 4: QuickBooks integration. Phase 5: FedEx flow rework (fold EULA +
   identity verification into signup, drop the per-customer FedEx account number).
7. Stand up Step 1 foundations as each phase's account/credential dependency is actually needed
   (hosting, domain, file storage).
8. Wire up Day & Ross live rates as the first real carrier integration.
9. Submit the FedEx Step 3 flow for approval early once its shape is settled (Phase 5) — it has its
   own external approval timeline and blocks going live to real customers regardless of what else
   is ready.
10. Build out the rest of Steps 4–7 (quoting → booking/payment → post-booking → billing) against
    the resolved architecture, confirming server-side markup enforcement as part of Step 4.
11. Build Step 8 admin tooling — the `requireRole` mechanism and `TODO` markers are already in
    place (Phase 1) for exactly this. Don't defer indefinitely once volume picks up.
12. Add the remaining carriers (XPO, Manitoulin, Polaris) as each becomes available.
