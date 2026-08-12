# Phase 2 Changes: MongoDB Migration + 6 New Collections

Implements Phase 2 of the architecture plan in `production_readiness.md` — swaps the database
engine from PostgreSQL/Prisma to MongoDB/Mongoose, and builds the 6 collections the client's
Customer Portal Guide describes that didn't exist in any form before this phase (`Address`,
`ClaimDocument`, `Payment`, `Carrier`, `MarkupRule`, `ActivityLog`). Full design rationale is in
the approved plan at `.claude/plans/ethereal-squishing-cascade.md`; this file is a changelog of
what was actually implemented.

**Status:** complete and verified. Local MongoDB is running as a single-node replica set, seeded,
and the full Quote → Booking → Shipment flow was tested live against the running API — including
the transactional writes that require the replica set.

---

## 1. Local MongoDB setup

MongoDB 6.0 (already installed via Homebrew) is now configured as a single-node replica set —
required because `booking.service.js` and `rate.service.js` need multi-document transactions,
which standalone MongoDB doesn't support.

- `/opt/homebrew/etc/mongod.conf` gained a `replication: { replSetName: rs0 }` block.
- `brew services restart mongodb-community@6.0`, then one-time `mongosh --eval "rs.initiate()"`.
- Connection string: `mongodb://localhost:27017/iffcargo?replicaSet=rs0` — the `?replicaSet=rs0`
  is required, not optional, or transactions silently don't route correctly.

## 2. Guide-anchored modeling decisions

The client's guide names exactly 17 target collections. Where its own wording settled a
modeling question, that won over the more "Mongo-idiomatic" alternative:

- **`QuoteRate` and `TrackingEvent` stayed separate collections**, not embedded subdocuments —
  the guide names "Quote options" and "Tracking events" as their own collections.
- **`NotificationPreference` became an embedded object on `User`**, not its own collection — the
  guide lists notification prefs as a field under Users, not one of the 17.
- **`InvoiceItem` became an embedded array on `Invoice`** — not one of the guide's 17 either; the
  guide's own description of an invoice ("holds a list of bookings") reads as an array field.

## 3. New backend structure

- **`backend/src/models/`** — 19 Mongoose model files (13 ported from the old Prisma schema +
  6 new). Every relation field became a single `{ type: ObjectId, ref: 'Model' }` (Prisma needed
  a raw-id field plus a relation field; Mongoose only needs one). `mongoose.set('toJSON', {
  virtuals: true })` in `config/database.js` means every response still includes an `id` string
  field alongside `_id`, so existing frontend code reading `.id` didn't need to change.
- **`backend/src/config/database.js`** — replaced the single Prisma-client export with a
  `connectDB()` that calls `mongoose.connect()`. Services now `require('../models/X')` directly
  per model, rather than importing one shared client object.
- **`backend/src/middleware/errorHandler.js`** — added handling for Mongoose `CastError`
  (malformed id → 400) and `ValidationError`, replacing the old Prisma `P2002` duplicate-key
  check with Mongoose's `code === 11000`.
- **`backend/src/utils/validators.js`** (new) — shared `objectId()` zod helper, replacing the
  `.uuid()` validator that no longer matches Mongo's id format.
- **`backend/src/index.js`** — startup is now async (`await connectDB()` before `app.listen`);
  the `/health` handler's carrier check is now async too (see below).

## 4. Service rewrites (11 files)

Every service that touched Prisma (`auth`, `billing`, `booking`, `claim`, `fedexAccount`,
`profile`, `quote`, `rate`, `shipment`, `spotRate`, `tracking`) was ported to Mongoose calls.
Non-mechanical points:

- **`booking.service.js`** — its transaction (Booking + Quote update + Shipment creation) is now
  a real `mongoose.startSession()` + `session.withTransaction(...)` block.
- **`rate.service.js`** — same treatment for Quote + QuoteRate creation (kept as a transaction
  since `QuoteRate` stayed a separate collection per the guide-anchored decision above).
- **`auth.service.js`** — `generateToken` now includes `companyId` in the JWT payload (same
  reasoning Phase 1 used for `role`: avoids an extra DB read per request in the new address
  routes). `middleware/auth.js` was updated to read it onto `req.user.companyId`. **Existing
  sessions need one re-login** after this change.
- **`billing.service.js`** — `getBillingStats` previously read `displayRate`/`baseRate` directly
  off `Shipment` records. Those fields no longer exist on `Shipment` in the new schema (they live
  on `Booking`) — this wasn't a stylistic choice, the old code would have silently returned `NaN`
  against the new model, so `getBillingStats` now sources from `Booking` instead.
- **`utils/trackingGenerator.js`** — a real bug was caught during verification: this file was
  never actually updated for Mongoose in the first implementation pass and still referenced the
  old Prisma client shape, which crashed the seed script immediately (`Cannot read properties of
  undefined`). Fixed by porting it to `Model.countDocuments()` per model. This carries forward a
  pre-existing race condition under concurrent writes (present in the Prisma version too, not
  introduced by this migration) — flagged for a follow-up ticket, not fixed here.
- **`backend/src/carriers/index.js`** — `getAllCarriers()`/`getCarrier()` are now `async`,
  layering a `Carrier` collection enabled/disabled check on top of the unchanged adapter modules
  (`fedex.adapter.js` etc. — their mocked rate/tracking logic wasn't touched). Verified via
  `GET /health`, which now reports carrier availability from the database.
- **`markup.service.js`** — `applyMarkup()` now queries the `MarkupRule` collection instead of a
  hardcoded ladder, and is `async` — its two callers in `rate.service.js` now `await` it inside a
  `Promise.all`. Verified live: a $525 base rate produced a 1.30× markup, matching the seeded
  $500–$1000 tier exactly.

## 5. New collections, wired to the depth agreed in the plan

- **`Carrier`** and **`MarkupRule`** — fully real and live (see above), not just schema.
- **`Address`** — real CRUD (`address.service.js` + `address.routes.js`, mounted at
  `/api/addresses`), scoped by `companyId`. Verified live: returns the seeded company address.
  No new frontend UI this phase.
- **`ActivityLog`** — `activityLog.service.js`'s `logActivity()` helper, fire-and-forget so a
  logging failure never breaks the primary action. Wired into successful login, FedEx EULA
  acceptance, booking creation, and (once built) markup-rule changes.
- **`Payment`** and **`ClaimDocument`** — model + minimal service only (create/list), deliberately
  **not** wired into `createBooking()` or `submitClaim()` and no routes mounted. There's no real
  QuickBooks charge flow or file-storage service to back them yet — same "mock the shape, not the
  behavior" pattern already used for carrier adapters and the FedEx EULA/MFA flow. Faking payment
  success or file records into real flows would be misleading, not useful scaffolding.

## 6. Seed script (`backend/src/seed.js`, relocated from `backend/prisma/seed.js`)

Same fixture narrative as Phase 1 (4 role fixtures, 1 browsable quote, 7 shipments — 6 assembled
directly + 1 through the real `bookingService.createBooking()`, 4 claims, 5 invoices), plus:
`Carrier` (5 rows) and `MarkupRule` (6-tier ladder) seeded *first* since booking/rate logic now
depends on them; one `Address` on the seeded company; one `ActivityLog` row via the real helper;
one stub `Payment` off the real-flow booking (`qbTransactionId: null`, explicitly not faking a
real one); one stub `ClaimDocument` off a seeded claim (`storageKey` an obvious placeholder).

## 7. Removed

`backend/prisma/` (schema, migrations, old seed script) deleted entirely — fully superseded.
`@prisma/client` and `prisma` removed from `package.json`; `mongoose` added. `db:migrate` and
`db:studio` npm scripts removed (no Mongo equivalent — `mongosh iffcargo` or MongoDB Compass are
the closest analogs, documented in `CLAUDE.md` instead of building a custom admin UI).

## 8. Verification performed

1. `mongosh --eval "rs.status()"` confirmed `PRIMARY`.
2. `npm run db:seed` — connected, seeded all 22 collections including a real
   `bookingService.createBooking()` call, no errors (after fixing the `trackingGenerator.js` bug
   above).
3. Backend started clean (`MongoDB connected`, `IFF Cargo backend running on port 4000`).
4. `GET /health` — confirmed all 5 carriers report enabled from the `Carrier` collection.
5. Full login flow (password → OTP → JWT) — confirmed `companyId` now present in the token.
6. `POST /api/rate/all` (authenticated) — confirmed `quoteId`/`quoteRateId` still present per
   rate, and the markup multiplier applied was mathematically correct against the seeded
   `MarkupRule` tiers.
7. `POST /api/bookings` — confirmed a `Booking` and linked `Shipment` were both created via the
   session transaction.
8. `GET /api/shipments` — the newly booked shipment appears alongside the 7 seeded ones (8 total).
9. `GET /api/addresses` — returns the seeded company address, correctly scoped by `companyId`.
10. `npx next build` in `frontend/` — passes cleanly; no frontend code changes were needed.

## 9. Explicitly out of scope for this phase

- Real QuickBooks charge flow, real file storage/upload for claim documents.
- Any frontend UI for `Address`, `ActivityLog`, `Carrier`/`MarkupRule` admin management.
- Fixing the `trackingGenerator.js` race condition (pre-existing, not introduced here).
- Money-as-integer-cents (tracked separately, applies to all money fields at once).
- Company-level data scoping beyond what already existed from Phase 1's denormalized `companyId`
  fields (the broader `userId` → `companyId` query-scoping fix across services is still a
  separate follow-up, unchanged from Phase 1's status).
- Auth0 swap, QuickBooks integration, FedEx flow rework — later phases per the agreed sequencing.
