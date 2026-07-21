# IFF Cargo - Project Instructions

## Project Overview
IFF Cargo is a freight forwarding platform that compares shipping rates from 5 Canadian carriers (FedEx, XPO Logistics, Day & Ross, Manitoulin, Polaris). Users input shipment size, weight, and destination to get instant rate comparisons.

## Project Structure
```
├── Web Design/iffcargo-website/   # Original static HTML/CSS/JS (reference designs)
├── frontend/                       # Next.js React app (port 3000)
│   ├── app/
│   │   ├── layout.js              # Root layout (fonts, global CSS)
│   │   ├── globals.css            # Design system (CSS vars, shared styles)
│   │   ├── page.js                # Landing page (/)
│   │   ├── page.module.css
│   │   ├── login/page.js          # Login (/login)
│   │   ├── register/page.js       # Multi-step registration (/register)
│   │   └── portal/
│   │       ├── layout.js          # Portal layout (sidebar + topbar + auth guard)
│   │       ├── page.js            # Dashboard (/portal)
│   │       ├── quote/page.js      # Rate comparison (/portal/quote)
│   │       ├── shipments/page.js  # Shipment list (/portal/shipments)
│   │       ├── track/page.js      # Tracking (/portal/track)
│   │       ├── claims/page.js     # Claims (/portal/claims)
│   │       ├── profile/page.js    # Profile settings (/portal/profile)
│   │       └── billing/page.js    # Billing (/portal/billing)
│   ├── components/
│   │   ├── Sidebar.js             # Portal sidebar navigation
│   │   └── Topbar.js              # Portal top bar
│   ├── lib/
│   │   ├── api.js                 # API helper (fetchAPI with JWT auth)
│   │   └── carriers.js            # Carrier data (colors, names, abbreviations)
│   └── public/
│       ├── logo.svg, logo-white.svg, logo.png
├── backend/                        # Node.js + Express API (port 4000)
│   ├── src/
│   │   ├── index.js               # Express app
│   │   ├── carriers/              # Carrier adapter pattern (5 adapters)
│   │   ├── services/              # Business logic
│   │   ├── routes/                # API route handlers
│   │   ├── middleware/            # Auth, validation, error handling
│   │   └── utils/                 # Helpers
│   └── prisma/
│       ├── schema.prisma          # Database models (PostgreSQL)
│       └── seed.js                # Demo data
└── APIs/                           # Carrier API documentation (PDFs)
```

## Running the Frontend (Next.js)
```bash
cd frontend
npm install              # Install dependencies (first time only)
npm run dev              # Start dev server on port 3000
```

## Running the Backend
```bash
# 1. Start PostgreSQL (must be running before the backend)
brew services start postgresql@17

# 2. Start the backend
cd backend
npm install              # Install dependencies (first time only)
npm run db:migrate       # Run Prisma migrations (first time or after schema changes)
npm run db:seed          # Seed demo data (first time only)
npm run dev              # Start server on port 4000 (with nodemon auto-reload)
```

## Running Both Together
```bash
# Terminal 1: Backend (must be started first)
brew services start postgresql@17
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```
Then open http://localhost:3000 in your browser.

## Stopping Everything
```bash
# Stop the frontend: Ctrl+C in the terminal running frontend npm run dev
# Stop the backend: Ctrl+C in the terminal running backend npm run dev
# Stop PostgreSQL:
brew services stop postgresql@17
```

## Demo Credentials
- **User:** john@acmecorp.com / `demo1234`
- **Admin:** admin@iffcargo.com / `admin1234`

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React, CSS Modules
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL 17 (via Homebrew)
- **Auth:** JWT + bcrypt (token stored in localStorage)
- **Validation:** Zod
- **Fonts:** Outfit (display), DM Sans (body), JetBrains Mono (mono)

## Frontend Architecture (Next.js)
- **Framework:** Next.js 16 with App Router (all pages are `'use client'`)
- **Styling:** CSS Modules (`.module.css` files) — pixel-for-pixel copy of original HTML designs
- **State:** React hooks (`useState`, `useEffect`) — no global state library needed
- **API calls:** `lib/api.js` wraps `fetch()` with JWT token from localStorage
- **Auth guard:** Portal layout redirects to `/login` if no token present
- **Rate simulation:** Client-side deterministic seeded RNG as fallback when backend is unavailable
- **Route structure:** Public pages at root (`/`, `/login`, `/register`), protected pages under `/portal/*`

### Frontend Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page (hero, services, footer) |
| `/login` | Split-screen login with API auth |
| `/register` | 3-step registration (info → company → EULA) |
| `/portal` | Dashboard (stats, quick action, recent shipments) |
| `/portal/quote` | Rate comparison — 6 types (envelope, parcel, LTL = instant; FTL, air, ocean = spot rate) |
| `/portal/shipments` | Shipment list with status filters, search, expandable detail rows |
| `/portal/track` | Tracking number lookup with timeline visualization |
| `/portal/claims` | Claims list + modal to file new claim |
| `/portal/profile` | Personal info, company info, change password |
| `/portal/billing` | Payment methods, invoices table, spending stats |

## Database (PostgreSQL)
- **Engine:** PostgreSQL 17 (installed via Homebrew)
- **Database name:** `iffcargo`
- **Connection string:** `postgresql://Naghmeh.Dezhabad%40MLSE.com@localhost:5432/iffcargo`
- **ORM:** Prisma (schema at `backend/prisma/schema.prisma`)
- **Start PostgreSQL:** `brew services start postgresql@17`
- **Stop PostgreSQL:** `brew services stop postgresql@17`
- **View data visually:** `cd backend && npm run db:studio` (opens Prisma Studio in browser)
- **Reset database:** `cd backend && npm run db:reset` (drops all tables, re-migrates, requires re-seed)
- **Re-seed data:** `cd backend && npm run db:seed`
- **PATH note:** PostgreSQL binaries are at `/opt/homebrew/opt/postgresql@17/bin` — add to PATH if you need `psql` directly
- **Direct access:** `export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH" && psql iffcargo`

### Why PostgreSQL
- Data is highly relational (users → quotes → rates → shipments → tracking → invoices)
- ACID transactions for booking (creates records in multiple tables atomically)
- Handles complex filtering queries (shipments by status, date range, carrier)
- Financial data (rates, invoices) requires consistency guarantees
- Scales to millions of records without architecture changes

## Database Schema (11 tables)

### Users & Companies
| Table | What it stores |
|-------|---------------|
| **User** | id, email, passwordHash, firstName, lastName, phone, role (`customer`/`admin`), companyId |
| **Company** | name, country, province, city, postalCode, shippingType |
| **NotificationPreference** | Per-user toggles (shipmentBooked, outForDelivery, delivered, exceptions, spotRates, claims, promotional) |

### Quoting
| Table | What it stores |
|-------|---------------|
| **Quote** | quoteNumber, shipmentType, origin/dest (city, postal, country), weight, pieces, dimensions, freightClass, currency, pickupDate, declaredValue, commodity, accessorials, status, expiresAt |
| **QuoteRate** | One row per carrier result — carrierId, carrierName, serviceName, baseRate (cost), displayRate (marked up), transitDays, estimatedDelivery, isLiveRate, isBestRate |

### Shipments & Tracking
| Table | What it stores |
|-------|---------------|
| **Shipment** | trackingNumber, linked to user + quote, carrier info, full origin/dest details, weight/pieces/dims, baseRate, displayRate, status (`pending`/`in_transit`/`delivered`), estimatedDelivery, actualDelivery |
| **TrackingEvent** | Per-shipment timeline — event name, location, timestamp, description |

### Claims
| Table | What it stores |
|-------|---------------|
| **Claim** | claimNumber, trackingNumber, carrier, claimType, shipmentDate, amountClaimed, commodity, description, notes, documents, status (`open`/`in_progress`/`resolved`) |

### Billing
| Table | What it stores |
|-------|---------------|
| **PaymentMethod** | type (visa/mastercard), last4 digits, expiry, isDefault |
| **Invoice** | invoiceNumber, totalAmount, currency, status (`pending`/`paid`), issuedAt, paidAt |
| **InvoiceItem** | Line items per invoice — linked to shipment, description, amount |

### Spot Rates
| Table | What it stores |
|-------|---------------|
| **SpotRateRequest** | For FTL/air/ocean quotes needing manual pricing — requestNumber, shipment details, origin/dest ports (ocean), commodity, specialNotes, status, quotedRate, quotedAt |

### Relationships
```
User → Company (many-to-one)
User → Quotes → QuoteRates (one-to-many)
User → Shipments → TrackingEvents (one-to-many)
User → Claims
User → PaymentMethods
User → Invoices → InvoiceItems → Shipment
User → SpotRateRequests
Quote → Shipment (one-to-one, when booked)
```

### Not yet in DB (needed for production)
- Stripe customer ID / payment intent ID (for payments)
- Carrier API credentials storage
- Audit log (who did what, when)
- Rate cache table
- Email verification status
- Password reset tokens

## Key API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Server status + carrier availability |
| `POST /api/rate/all` | Get rates from all 5 carriers (core feature) |
| `POST /api/rate/fedex` | Legacy FedEx endpoint (frontend compatibility) |
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | Login, returns JWT |
| `POST /api/shipments` | Book a shipment from a quote |
| `GET /api/shipments` | List user shipments (filter: ?status=in_transit) |
| `GET /api/tracking/:number` | Track a shipment |
| `POST /api/claims` | Submit a cargo claim |
| `GET /api/claims` | List user claims |
| `GET /api/billing/stats` | Spending stats (month/year) |
| `GET /api/billing/invoices` | Invoice history |
| `GET/PUT /api/profile` | User profile management |
| `POST /api/spot-rates` | Submit spot rate request (FTL/air/ocean) |

## Carrier Adapter Pattern
Each carrier is in `backend/src/carriers/<name>.adapter.js` implementing a common interface:
- `getRates(params)` — returns rates for given shipment
- `getTracking(trackingNumber)` — returns tracking info
- `bookShipment(details)` — books with the carrier

All adapters are currently **mocked**. To enable live API calls, add credentials to `backend/.env` — the adapter auto-switches when keys are present.

### Adding a New Carrier
1. Create `backend/src/carriers/<name>.adapter.js` extending `CarrierAdapter`
2. Register it in `backend/src/carriers/index.js`
3. Add env vars to `.env` for live API credentials
4. The carrier automatically appears in `/api/rate/all` results

## Markup Engine (backend/src/services/markup.service.js)
```
≤$100  → ×1.70 (70% markup)
≤$250  → ×1.55 (55% markup)
≤$500  → ×1.40 (40% markup)
≤$1000 → ×1.30 (30% markup)
≤$2500 → ×1.20 (20% markup)
>$2500 → ×1.15 (15% markup)
```

## Production Deployment

### Database Options for Production
| Provider | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| **Neon** | 512MB, scales to zero | $19/mo | Serverless PostgreSQL, cheapest to start |
| **Supabase** | 500MB, 2 projects | $25/mo | Built-in auth, dashboard, real-time |
| **Railway** | 1GB, $5 credit/mo | Usage-based | Simplest — deploy backend + DB together |
| **Render** | No free DB | $7/mo | Pairs with Render backend hosting |
| **DigitalOcean** | None | $15/mo | Reliable, daily backups included |
| **AWS RDS** | 12 months free tier | $15-50/mo | Enterprise-grade, most configurable |
| **Google Cloud SQL** | $300 credit (90 days) | $10-40/mo | Google ecosystem |
| **Azure Database** | $200 credit (30 days) | $15-50/mo | Microsoft ecosystem |

### Backend Hosting Options
| Provider | Cost | Notes |
|----------|------|-------|
| **Railway** | Free → $5/mo | Easiest for Express — zero code changes, deploy from Git |
| **Render** | Free (spins down) → $7/mo | Simple, auto-deploy from Git |
| **Vercel** | Free → $20/mo | Great for frontend; backend needs serverless conversion |
| **DigitalOcean App Platform** | $5/mo | Simple traditional hosting |
| **AWS (EC2/ECS)** | $10+/mo | Full control, complex setup |

### Recommended Deployment Strategy
| Stage | Setup |
|-------|-------|
| **Now (development)** | Local PostgreSQL + `npm run dev` |
| **MVP / first deploy** | **Railway** (backend + database together, no code changes) |
| **Growing / production** | **Vercel** (frontend CDN) + **Neon** (database) + **Railway** (backend API) |

### Switching to Production Database
No code changes needed — just update `.env`:
```env
# Local (current)
DATABASE_URL="postgresql://Naghmeh.Dezhabad%40MLSE.com@localhost:5432/iffcargo"

# Production examples:
# Neon:
DATABASE_URL="postgresql://user:pass@ep-cool-name-123.us-east-2.aws.neon.tech/iffcargo?sslmode=require"
# Supabase:
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxx.supabase.co:5432/postgres"
# Railway:
DATABASE_URL="postgresql://postgres:pass@containers-us-west-123.railway.app:5432/railway"
```
Then run `npm run db:migrate` against the production database.

### Why Not Convex?
Convex is an all-in-one backend platform (database + functions + auth in TypeScript). Not recommended for IFF because:
- Would require rewriting the entire backend from scratch
- Document-style DB is awkward for our heavily relational data (quotes → rates → shipments → events → invoices)
- Vendor lock-in — can't move without rewriting
- Charges per function call — rate comparison is API-call-heavy

### Why Not Vercel for Backend?
Vercel is ideal for hosting the **frontend** (static HTML on CDN). For the Express backend:
- Requires converting to serverless functions (code restructuring)
- 10s function timeout on free tier — carrier API calls can be slow
- Cold starts add latency
- Railway runs our Express code as-is with zero changes

## Frontend ↔ Backend Connection
- The Next.js frontend runs on `http://localhost:3000`
- It calls the backend API at `http://localhost:4000` (hardcoded in `frontend/lib/api.js`)
- All API calls include JWT token from localStorage (set at login)
- The frontend works without the backend (shows demo/mock data) but needs it for real auth and rate fetching
- CORS is enabled on the backend for localhost origins

## Conventions
- Routes in `src/routes/*.routes.js`, services in `src/services/*.service.js`
- All protected endpoints require `Authorization: Bearer <token>` header
- Errors return `{ error: { code, message, details? } }`
- Pagination returns `{ data, pagination: { page, limit, total } }`

---

## Available Carriers in Canada

### Currently Integrated (5 carriers — mocked)
| Carrier | ID | Services | API Status |
|---------|----|----------|------------|
| FedEx | `fedex` | Express, Ground, Freight LTL, International | Mock (have setup docs) |
| XPO Logistics | `xpo` | LTL, Cross-border | Mock |
| Day & Ross | `dayross` | LTL, Parcel, Express | Mock (API form submitted, acct #197742) |
| Manitoulin Transport | `manitoulin` | LTL, Northern/remote Canada | Mock |
| Polaris Transportation | `polaris` | LTL, Ontario/Quebec/Western/US NE | Mock |

### Priority Carriers to Add Next
| Priority | Carrier | Why | API |
|----------|---------|-----|-----|
| 1 | Purolator | Largest Canadian-owned courier, parcel + freight | Yes — developer.purolator.com |
| 2 | UPS | Second-largest global carrier, full API suite | Yes — developer.ups.com |
| 3 | Canpar Express | Popular Canadian parcel/ground (TFI subsidiary) | Yes |
| 4 | Canada Post | Essential for residential/rural, cheapest for light parcel | Yes — developer.canadapost.ca |
| 5 | TST Overland / Canadian Freightways | TFI International brands, strong Canadian LTL | Yes |

### All Courier & Parcel Carriers in Canada
| Carrier | Services | API |
|---------|----------|:---:|
| FedEx | Express, Ground, Home Delivery, International | Yes |
| UPS | Ground, Express, International | Yes |
| Purolator | Express, Ground, Freight | Yes |
| Canada Post | Regular, Xpresspost, Priority, International | Yes |
| DHL Express | International express, domestic | Yes |
| Canpar Express | Ground, Express (TFI subsidiary) | Yes |
| Loomis Express | Ground, Express (western Canada strong) | Yes |
| GLS Canada | Parcel delivery | Yes |
| IntelCom | Last-mile delivery (Amazon partner) | Limited |
| Nationex | Parcel, same-day (Quebec/Ontario) | Yes |

### All LTL Freight Carriers in Canada
| Carrier | Coverage | API |
|---------|----------|:---:|
| Day & Ross | All Canada + cross-border US | Yes |
| Manitoulin Transport | All Canada, specializes in remote/northern | Yes |
| Polaris Transportation | Ontario, Quebec, Western Canada, US NE | Yes |
| XPO Logistics | Canada + US cross-border | Yes |
| FedEx Freight | Canada + US LTL | Yes |
| Kindersley Transport | Western Canada, Alberta focus | Limited |
| TST Overland (TFI) | Canada-wide LTL | Yes |
| ABF Freight | Cross-border Canada-US | Yes |
| R+L Carriers | Cross-border Canada-US | Yes |
| Saia | Cross-border, Southern US to Canada | Yes |
| Old Dominion (ODFL) | Cross-border Canada-US | Yes |
| Fastfrate | Canada-wide, intermodal | Limited |
| Midland Transport | Atlantic Canada, Quebec, Ontario | Yes |
| Canadian Freightways (TFI) | Western Canada | Yes |
| Rosenau Transport | Alberta, BC, Saskatchewan | Limited |
| Estes (formerly YRC/Vitran) | Cross-border Canada-US | Yes |
| Purolator Freight | Heavy parcel + LTL | Yes |

### FTL (Full Truckload) Carriers in Canada
| Carrier | Coverage | API |
|---------|----------|:---:|
| TransX | Canada-wide + cross-border | Limited |
| Challenger Motor Freight | Canada + US | Limited |
| Bison Transport | Canada-wide, western strong | Limited |
| Heartland Express | Cross-border | Yes |
| Schneider National | Canada-US cross-border | Yes |
| J.B. Hunt | Cross-border | Yes |
| Trimac | Bulk/specialized, Canada-wide | Limited |

### Day & Ross API Details (from submitted form)
- **Account:** #197742 (International Freight Forwarders)
- **API Type:** REST (went live March 2026), OAuth authentication
- **Developer:** Uzair Amir (uzair@iffcargo.com)
- **API Email:** api@iffcargo.com
- **Services approved:** Create Shipment, Create Quote, Get Rate, Get Shipment, Get Shipment Status, Get Image PDF, Get Invoice History, Cancel Shipment
- **Contact:** web.support@dayross.com

### FedEx API Details (from product worksheet)
- **Key APIs for IFF:** Comprehensive Rates & Transit Times API, Freight LTL API, Ship API, Track API, Pickup Request API
- **Region:** AMERS (US, Canada, Latin America)
- **Canada-specific:** FedEx Economy (CA only), International Ground (CA↔US), rate quotes with/without Canadian tax
- **Portal:** developer.fedex.com
- **Important:** Do not hard-code business logic — use Service Availability API for dynamic service lists
