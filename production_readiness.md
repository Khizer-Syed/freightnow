# Production Readiness Checklist

Reconciled against `IFF Customer Portal Guide.md` — the client's own product spec — as of this
writing. That guide is now the authoritative source for what "done" means; this doc tracks status
against it, plus anything it doesn't cover.

**Read this first:** the guide describes an architecture that differs from what's currently built
in several places. Those aren't small tweaks — they're decisions the team needs to make explicitly
before more work goes into the current stack. See the section immediately below before treating
anything else here as settled.

---

## 0. Architecture decisions needed — current build vs. the client spec

- [ ] **Database: MongoDB (per guide) vs. PostgreSQL/Prisma (currently built).** The guide
  describes 17 MongoDB collections and explicitly says "Khizer will set this up." The current
  backend is Postgres with an 11-table Prisma schema. This is a fundamental mismatch, not a naming
  difference — confirm with Khizer whether the Postgres work is being superseded or whether the
  guide's MongoDB framing is aspirational/outdated. Don't keep building on Postgres without
  resolving this.
- [ ] **Auth: Auth0/Firebase (per guide) vs. custom JWT + bcrypt (currently built).** The guide is
  explicit that passwords should never touch IFF's own database — a specialist identity provider
  handles login and hands back a token, which also satisfies FedEx's identity-verification
  requirement "for free." The current backend hashes and stores passwords itself
  (`backend/src/services/auth.service.js`, `bcrypt` + `jsonwebtoken`). Note: a `TwoFactorCode`
  model already exists in the schema with a `login-2fa` purpose — worth checking whether that
  already covers signup-time verification before assuming a full Auth0/Firebase migration is
  needed, but the password-storage question itself is real and unresolved.
- [ ] **Payments: QuickBooks (per guide) vs. Stripe (assumed in earlier planning).** The guide is
  specific — QuickBooks processes cards and hands back a token; nothing else is stored. Earlier
  versions of this checklist and `CLAUDE.md`'s "not yet in DB" notes assumed Stripe. Correct that
  assumption going forward: any payment integration work should target QuickBooks, not Stripe.
- [ ] **FedEx compliance flow is more elaborate than the guide asks for.** What's currently built
  (`FedexConnectModal.js`, `fedexAccount.service.js`) is a full FedEx Integrator "connect your own
  FedEx account" flow — a 9-digit FedEx account number, address, and a Factor 1/Factor 2
  PIN-or-invoice challenge per customer, done post-signup from the Profile page. The guide's Step 3
  asks for something simpler: FedEx's terms shown and recorded (who/when/IP address) **as part of
  signup itself**, a signup-time identity-verification code by text or email, an "estimate, not
  final" note on every quote, and address validation before booking — with no per-customer FedEx
  account number at all, consistent with IFF using its own negotiated account for every customer.
  These aren't necessarily contradictory (FedEx's raw Integrator guidance may still require the
  fuller flow to mint the child credentials FedEx's API demands), but the customer-facing shape is
  different enough that it needs a decision: fold today's modal into signup and simplify what it
  asks for, or keep it as a separate step and confirm with FedEx that the fuller flow is actually
  required for this business model.
- [ ] **Data model: `Booking` as a distinct record from `Shipment`.** The guide keeps these
  separate on purpose — a booking is the commercial agreement (payment succeeded or not), a
  shipment is the physical thing moving, and separating them is what lets you tell apart "customer
  was charged but the carrier rejected the shipment" from a normal flow. The current schema has no
  `Booking` model; it goes straight from `Quote` to `Shipment`. This is a real data-model gap, not
  just a naming one.
- [ ] **Money stored as decimals, not integer cents.** The guide is explicit that money should be
  stored as whole cents (`$312.40` → `31240`) specifically to avoid rounding drift across
  thousands of invoices. Current Prisma schema uses `Float` for all money fields (`baseRate`,
  `displayRate`, `totalAmount`, `amountClaimed`, etc.). Worth fixing before real invoicing volume,
  since it's a much bigger migration once real financial history exists.
- [ ] **Four-tier roles vs. two.** The guide specifies Customer, Company admin, IFF staff, IFF
  admin, each with different permissions (see the guide's role table). The current `User.role`
  field is a free-text string defaulting to `"customer"`, used today as just `customer`/`admin`.

None of the above are things to silently resolve — they're calls for whoever owns the roadmap
(you, Khizer, and/or the client) to make deliberately.

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

**Step 5 — Booking + payment.** Not built for real: no live carrier booking calls, no QuickBooks
integration, no `Booking` entity (see architecture section). Label/BOL generation depends on real
carrier APIs, which don't exist yet.

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
all in the guide's Step 8 but have no corresponding backend routes yet). The guide places this
late deliberately but warns not to defer it indefinitely once volume picks up.

**Step 9 — Remaining carriers.** All 5 carriers are currently mocked; none are "genuinely live"
per the guide's own done-criteria for this step. Day & Ross is closest (account #197742 approved,
API live since March 2026) and is the reasonable first real integration.

---

## 2. Known concrete issues (independent of the architecture questions above)

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

1. **Resolve the architecture decisions in section 0 first** — database, auth provider, payment
   processor, and the FedEx flow's shape. Building further on the current stack without settling
   these risks throwing work away.
2. Fix the PIN-logging leak — small, fast, real security issue, worth doing regardless of the
   above.
3. Get the tax-treatment question in front of an accountant now — it has its own lead time and
   blocks Step 7 regardless of engineering progress.
4. Stand up Step 1 foundations once the database/auth/payment decisions are made (hosting, domain,
   file storage, whichever DB and auth provider were chosen).
5. Wire up Day & Ross live rates as the first real carrier integration.
6. Work the (now-settled) FedEx Step 3 flow and submit for approval early — it has its own external
   approval timeline and blocks going live to real customers regardless of what else is ready.
7. Build out Steps 4–7 (quoting → booking/payment → post-booking → billing) against the resolved
   architecture, confirming server-side markup enforcement as part of Step 4.
8. Build Step 8 admin tooling before — not after — volume makes hand-managing spot rates and claims
   the bottleneck.
9. Add the remaining carriers (XPO, Manitoulin, Polaris) as each becomes available.
