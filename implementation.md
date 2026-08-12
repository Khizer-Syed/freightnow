# Booking vs Shipment — How They Work

## The Concept

```
Quote → Booking → Shipment
```

| Entity | What it represents | When it's created |
|--------|-------------------|-------------------|
| **Quote** | "Here are your rate options" | When user clicks "Get quotes" |
| **Booking** | "I want to ship at this rate" — the customer's commitment | When user clicks "Book this rate" |
| **Shipment** | "The carrier has accepted it" — the carrier's side | Immediately after booking (mocked today) |

In production, there'd be a gap between booking and shipment (waiting for carrier API confirmation). Right now they're created together because carriers are mocked.

## Database Schema

**Booking** (the order):
```
id, bookingNumber (BK-2026-XXXX)
quoteId, quoteRateId → links back to what was quoted
userId, companyId → who booked it
carrierId, carrierName, serviceName → what they chose
costRate → what IFF pays the carrier
sellRate → what the customer pays (with markup)
currency, customerReference
status (confirmed/cancelled)
paymentStatus, bookedAt
```

**Shipment** (the physical movement):
```
id, trackingNumber (IFF-2026-XXXXX)
bookingId → links to the booking (1:1)
userId, companyId
carrierId, carrierName, serviceName, shipmentType
origin/dest details, weight, dimensions
status (pending/in_transit/delivered)
estimatedDelivery, actualDelivery
→ has many TrackingEvents (timeline)
```

## The Flow in Code

**1. User gets a quote** — `backend/src/services/rate.service.js`
- Calls all 5 carrier adapters for rates
- If user is logged in, saves a `Quote` + `QuoteRate` rows to DB
- Returns rate IDs so the frontend can book them

**2. User clicks "Book this rate"** — `backend/src/services/booking.service.js`
```
POST /api/bookings { quoteId, quoteRateId }
```
Inside `createBooking()`:
1. Validates the quote exists, isn't expired/already booked
2. Finds the selected rate from the quote's rates
3. Creates a `Booking` record (generates `BK-2026-XXXX`)
4. Marks the quote as `status: 'booked'`
5. Calls `shipmentService.createShipmentForBooking()` — creates the shipment + first tracking event ("Booked")
6. Returns both `{ booking, shipment }` in one response

**3. Shipment is created** — `backend/src/services/shipment.service.js`
- Generates tracking number (`IFF-2026-XXXXX`)
- Copies origin/dest/weight/dims from the quote
- Sets status to `pending`
- Creates initial tracking event: "Booked — awaiting carrier pickup"

## Why They're Separate

| Scenario | Booking says | Shipment says |
|----------|-------------|---------------|
| Just booked | Confirmed | Pending pickup |
| Carrier picked up | Confirmed | In transit |
| Delivered | Confirmed | Delivered |
| Customer cancels before pickup | Cancelled | (deleted or cancelled) |
| Carrier rejects | Confirmed → Failed | Never created |
| Payment fails | Confirmed → Payment hold | Pending (held) |

In production with real carrier APIs:
- **Booking** = IFF's record of what the customer committed to (rate, payment)
- **Shipment** = only created once the carrier confirms acceptance (could be async/webhook)
- A booking could exist without a shipment (carrier rejected, payment failed, etc.)

## Relationship

```
Quote (1) ──→ (1) Booking (1) ──→ (1) Shipment (1) ──→ (many) TrackingEvents
  └── (many) QuoteRates
```

The `Shipment.bookingId` field is what links them. The booking holds the financial data (`costRate`/`sellRate`), while the shipment holds the logistics data (tracking, delivery dates, events).
