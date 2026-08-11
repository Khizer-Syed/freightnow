# Phase 1 Changes: Booking/Shipment Split + Four-Tier Roles

Implements Phase 1 of the architecture plan in `production_readiness.md` — the two changes that
don't require any new external accounts (MongoDB, Auth0, QuickBooks are later phases). Full design
rationale lives in the approved plan at `.claude/plans/ethereal-squishing-cascade.md`; this file is
a changelog of what was actually implemented.

**Status:** complete and verified. Migration applied, database reseeded, and the full
Quote → Booking → Shipment flow tested live against the running API: logged in as
`john@acmecorp.com`, requested rates and confirmed `quoteId`/`quoteRateId` are now present on each
one, booked a rate via `POST /api/bookings`, and confirmed the resulting shipment appears in
`GET /api/shipments`. Frontend build (`next build`) passes cleanly with the quote-page fixes.

---

## 1. Database schema (`backend/prisma/schema.prisma`)

**New `Booking` model** — the commercial/administrative record (what was agreed, at what price,
paid or not, whose reference), kept distinct from `Shipment` (the physical/operational record).
Holds: `bookingNumber`, links to the `Quote` and the specific `QuoteRate` chosen, `userId` +
denormalized `companyId` (snapshot at booking time), frozen carrier/service info, `costRate` (what
IFF pays) and `sellRate` (what the customer pays — never shown together to the customer),
`customerReference` (PO number), `paymentStatus`, `status`, and pickup-confirmation fields.

**`Shipment` model changes:**
- Removed: `quoteId`/`quote` relation, `baseRate`, `displayRate` (pricing now lives on `Booking`).
- Added: `bookingId` (required, unique — every shipment now belongs to exactly one booking),
  `companyId` (denormalized, same purpose as on `Booking`).
- Everything else unchanged (tracking number, carrier fields, origin/destination, weight/dims,
  status, tracking events, claims, invoice items).

**`Quote` / `QuoteRate`:** `Quote.shipment` replaced with `Quote.booking`; `QuoteRate` gained a
`bookings` back-relation.

**`User.role`:** no type change (stays a plain string) — the doc-comment now lists the four allowed
values: `customer | company_admin | iff_staff | iff_admin`.

**`Claim.shipmentId` / `InvoiceItem.shipmentId`:** left pointing at `Shipment`, unchanged — both
are physical-shipment concepts, and a `Shipment` is still created synchronously the instant a
`Booking` is confirmed, so there's no case yet where they'd need to reference a booking without a
shipment.

## 2. New backend files

- **`backend/src/constants/roles.js`** — single source of truth for the four role values
  (`ROLES.CUSTOMER`, `ROLES.COMPANY_ADMIN`, `ROLES.IFF_STAFF`, `ROLES.IFF_ADMIN`).
- **`backend/src/middleware/requireRole.js`** — `requireRole(...allowedRoles)`, used after
  `authenticate` in a route chain; returns a 403 (`AuthorizationError`, already existed in
  `utils/errors.js` but was unused until now) if the requester's role isn't in the allowed list.
- **`backend/src/services/booking.service.js`** — `createBooking(userId, { quoteId, quoteRateId,
  customerReference })` validates the quote (not found / expired / already booked), creates the
  `Booking` and the resulting `Shipment` inside a single database transaction (the old code wasn't
  transactional), and marks the `Quote` as `booked`. Also `getUserBookings` and `getBookingById`.
- **`backend/src/routes/booking.routes.js`** — `POST /api/bookings`, `GET /api/bookings`,
  `GET /api/bookings/:id`, all behind `authenticate`.

## 3. Modified backend files

- **`backend/src/services/shipment.service.js`** — `bookShipment()` removed (logic moved to
  `booking.service.js`). Added `createShipmentForBooking(tx, booking, quote, selectedRate)`,
  called from `booking.service.js` right after a `Booking` is created — deliberately synchronous
  for now since carriers are still mocked; this is the seam to make async later once real carrier
  booking APIs exist. `getShipmentById` now also includes the linked `booking` so pricing is still
  reachable from a shipment-detail response.
- **`backend/src/services/rate.service.js`** — fixed a real bug: `getAllRates()` used to create the
  `Quote` and its `QuoteRate` rows in one nested write and never returned each `QuoteRate`'s id to
  the caller (only the parent `quoteId`). Rewritten to create the rates individually inside a
  transaction so each id is captured, and both `quoteId` and `quoteRateId` are now included on
  every rate object in the API response — required for booking a specific rate.
- **`backend/src/utils/trackingGenerator.js`** — added `generateBookingNumber()` (`BK-<year>-NNNN`,
  same pattern as the existing quote/claim/invoice number generators).
- **`backend/src/routes/shipment.routes.js`** — removed `POST /` (booking creation); now read-only
  (`GET /`, `GET /:id`). Booking a quote is now `POST /api/bookings`, not `POST /api/shipments`.
- **`backend/src/routes/index.js`** — mounted the new booking routes at `/api/bookings`.
- **`backend/src/routes/spotRate.routes.js`**, **`backend/src/routes/claim.routes.js`** — added
  `// TODO` comments marking where `requireRole(ROLES.IFF_STAFF, ROLES.IFF_ADMIN)` should be
  applied once staff-facing endpoints (pricing a spot rate, processing a claim) actually exist —
  they don't yet, so nothing is gated in this phase.
- **`backend/prisma/seed.js`** — rewritten: four users now seeded with real roles
  (`john@acmecorp.com` = customer, `jane@acmecorp.com` = company_admin — new,
  `staff@iffcargo.com` = iff_staff — new, `admin@iffcargo.com` = iff_admin). The old direct
  `Shipment.create()` loop is replaced with real `Quote → Booking → Shipment` chains; one fixture
  (the XPO shipment) is created by calling the real `bookingService.createBooking()` end-to-end to
  prove the new code path actually works, the rest are assembled directly where specific backdated
  statuses/tracking-event timestamps (delivered, in transit) need to be hand-set.

## 4. Frontend changes (`frontend/app/portal/quote/page.js`)

- **Bug fix:** `getQuotes()` was reading `r.totalRate` and `r.live` from the rate-quote API
  response, but the backend actually returns `displayRate` and `isLiveRate` — every live-rate
  result was silently broken and always fell through to the client-side demo-simulation fallback.
  Fixed the field names.
- Each mapped rate result now carries `quoteId`/`quoteRateId` from the API response.
- **The "Book this rate" button was previously a dead UI stub with no click handler at all.** It's
  now wired up: posts to `POST /api/bookings` with the quote/rate ids, shows a confirmation with
  the booking number and tracking number on success, and is disabled with a "Sign in to book" label
  when there's no real quote/rate id to book against (the simulated/demo-fallback rates, or an
  unauthenticated request).

## 5. Explicitly deferred (not in this phase)

- **Company-level data scoping** — today, shipments/quotes/claims/spot-rates are all scoped by
  individual `userId`, not `companyId`, even though the client's product guide describes everyone
  at a company sharing visibility. This phase denormalizes `companyId` onto `Booking`/`Shipment` so
  that fix is a small, isolated change immediately after this one — not bundled in here.
- **Any staff/admin-facing route** (pricing a spot rate, processing a claim, viewing all customers,
  editing markup rules) — none of these exist yet; only `TODO` markers were left for when they're
  built.
- Mongo migration, Auth0 swap, QuickBooks integration, FedEx flow rework — later phases, per the
  agreed sequencing.

## 6. Applying the migration

Adding the new required `bookingId` column to `Shipment` couldn't be done against the existing 7
demo shipments without a backfill, so — with explicit confirmation — the local dev database was
wiped and reseeded rather than backfilled. `prisma migrate dev` also turned out to refuse to run at
all outside a real interactive terminal, so the migration
(`backend/prisma/migrations/20260811042707_split_booking_from_shipment_and_roles/`) was generated
via `prisma migrate diff` and applied with `prisma migrate deploy`, both of which are safe for
scripted/non-interactive use.

Smoke test performed after reseeding:
1. `POST /api/auth/login` + `POST /api/auth/verify-otp` as `john@acmecorp.com` → real JWT.
2. `POST /api/rate/all` (authenticated) → confirmed every rate in the response now carries
   `quoteId` and `quoteRateId`.
3. `POST /api/bookings` with those ids → returned both a `Booking` (status `confirmed`) and a
   linked `Shipment` (status `pending`, one `Booked` tracking event).
4. `GET /api/shipments` → the new shipment (`IFF-2026-00008`) appears alongside the 7 seeded ones.
