IFF

INTERNATIONAL FREIGHT FORWARDERS

The Customer Portal

# 1. What we are building

Today, a customer who wants a price from IFF has to call or email, someone looks up rates, and a quote goes back by email. That works, but it takes staff time on every enquiry and it only happens during business hours.

The portal turns that into something customers can do themselves, at any hour. They create an account, type in what they are shipping and where it is going, and within seconds they see prices from every carrier IFF works with. They pick one, pay by card, print their shipping label, and track the shipment until it arrives. If something is lost or damaged, they file a claim through the same site.

The prices they see are not the carriers' prices. When FedEx quotes IFF $200 for a shipment, the system quietly adds a markup and shows the customer $310 for example. The customer never sees the $200, and never sees that a markup exists at all. That difference is IFF's margin, and it is earned automatically on every booking without anyone touching it.

## What the customer can and cannot price themselves

Three kinds of shipment get an instant price on screen: envelopes and documents, parcels and boxes, and LTL freight — pallets that share a truck with other companies' goods. These work instantly because the carriers publish rates through their computer systems and we can ask them directly.

Three kinds do not: full truckloads, partial truck loads, air freight, and ocean freight. Pricing on these depends on route, capacity, and current market conditions in ways no automatic system handles well. For these the customer fills in the same form, but instead of a price they get a message saying IFF will come back to them, and the request lands in a queue for your staff to price by hand.

# 2. The build order

Step 1   Set up the foundations

Before any of the website gets built, the accounts and infrastructure it will sit on need to exist.

Somewhere for the website to live — a hosting account, and the iffcargo.com domain pointed at it.

The database set up, which is where every piece of information the site holds will be kept. (Khizer will set this up)

A QuickBooks account, which is the service that will actually process card payments.

An account with the service that handles logins and passwords.

Somewhere to store files — shipping labels, bills of lading, claim photos, invoices.

An email service for automatic emails such as booking confirmations.

Done when: the developer can put a test page online and save a test record to the database.

Step 2   Build the public website and customer accounts

The part of the site anyone can see — home page, services, contact — plus the ability to create an account and sign in. The design already exists as a working prototype, so this stage is mostly about making those screens real rather than deciding how they should look.

Sign-up is three steps: personal details, company details, then the agreements. That third step matters more than it looks, and stage 3 explains why.

Done when: someone can visit the site, create an account, and log back in the next day.

Step 3   Meet the FedEx requirements and submit for approval

Four things have to be built and working:

FedEx's terms shown to every customer at sign-up, with a record of who accepted, when, and from where.

Identity verification at sign-up — a code sent by text or email that the customer types back in.

A note on every quote making clear the price is an estimate and may change.

Address checking built into the booking process.

Then screenshots of those screens, along with records of test transactions, get packaged up and sent to FedEx for approval. Until they approve, the site can only use FedEx's practice system, which returns realistic but not real prices.

Everything after this point can be built while you wait — but nothing can go live to real customers until approval comes through. Submit as early as you possibly can.

Done when: the submission is with FedEx and you have an acknowledgement.

Step 4   Build quoting

The heart of the product. The customer picks what they are shipping, fills in the details, and the system asks every carrier for a price at the same time, adds your markup to each, sorts them cheapest first, and puts them on screen.

The markup rules live in a settings area rather than buried in the code, so you can change your margins later without paying a developer to do it. Customer-specific discounts for your higher-volume accounts work the same way.

This stage also covers the other path — the full truckload, air, and ocean requests that go to your staff instead of to a carrier, and the screen where staff type in a price and send it back.

Done when: a customer can get real prices on screen and a spot request reaches your team.

Step 5   Build booking and payment

Turning a quote into an actual shipment. The customer picks a price, confirms the details, pays by card, and the system tells the carrier to create the shipment. The carrier sends back a tracking number and a shipping label, which the customer downloads and prints.

For freight, a bill of lading is produced as well. A pickup can be scheduled with the carrier at the same time.

Done when: a customer can pay and get a working label they could genuinely put on a box.

Step 6   Build everything that happens after booking

Once shipments are being created, customers need to see them. This stage builds the shipments list, the tracking screen, the claims process, and the automatic emails that go out when a shipment is booked, delivered, or runs into a problem.

Done when: a customer can find a past shipment, see where it is, and file a claim against it.

Step 7   Build billing

Invoices, invoice history, and downloadable PDFs. Straightforward for card-paying customers, where the invoice is really a receipt. More involved if you want to offer regular customers monthly invoicing on payment terms.

Done when: a customer can download a proper invoice for a past shipment.

Step 8   Build your own admin tools

The screens only IFF staff see: the queue of spot rate requests waiting to be priced, the claims queue, the markup settings, customer discount settings, and reporting on how much margin the portal is actually generating.

This is placed late because your team can work from email notifications in the short term, but do not defer it indefinitely — once volume picks up, doing this by hand becomes the bottleneck.

Done when: you can change your markup and see the effect without calling your developer.

Step 9   Add the remaining carriers

The system is built so that adding a carrier later is a small, contained piece of work rather than a rebuild. As each one becomes available, it slots in. Chasing your representatives at those three companies for access is worth doing in parallel with everything above.

Done when: every carrier on screen is showing genuine live pricing.

# 3. What gets stored in the database

The database is where everything the site knows is kept. MongoDB calls its tables "collections", but they do the same job: each one is a list of records of a particular kind, the way a spreadsheet tab holds rows of one type of thing.

There are seventeen. That sounds like a lot, but they group into six areas, and several are small settings tables you will never think about again once they are set up.

## Who your customers are

### Companies

One record per customer business. This is the account that gets billed and the level at which discounts apply — not the individual person. If three people at the same company sign up, they share one company record and one set of negotiated rates.

Business name and an IFF account number

Billing address, phone, tax number

Any volume discount you have agreed with them

Any custom markup that overrides your standard rates

Payment terms — pay by card up front, or invoiced monthly

Whether the account is active or suspended

### Users

One record per person who can log in. Each person belongs to exactly one company. Covered in detail in the next section, including the important point that passwords are not stored here.

Name, email address, phone number

Which company they belong to

What they are allowed to do — ordinary customer, or IFF staff

Whether they have completed identity verification

When they accepted your terms and FedEx's terms, and from what internet address

Which email notifications they want to receive

### Addresses

A saved address book, shared across everyone at the same company, so a regular customer does not retype their warehouse address every time.

Contact name, company name, phone

Street, city, province or state, postal code, country

Whether it is residential, which affects what carriers charge

Whether the address has been verified as deliverable

## Pricing

### Quotes

One record every time a customer asks for a price. It stores the question, not the answers — what they wanted shipped and where to.

A quote number the customer can refer to

Who asked, and for which company

Type of shipment — envelope, parcel, LTL freight, and so on

Where from and where to, as frozen copies of the addresses

Weight, number of pieces, dimensions, freight class

Extra services requested — liftgate, residential delivery, appointment, and so on

Requested pickup date and currency

Exactly when the quote stops being valid

### Quote options

The answers. One record per carrier price that came back, so a single quote showing five carriers produces five of these. This is where your margin is recorded.

Which carrier and which of their services

What the carrier charges IFF — never shown to the customer

What markup percentage was applied

Any customer discount applied

The final price the customer sees

How many days in transit and the estimated delivery date

Whether this was a live price or an estimate

### Spot requests

Full truckload, air, and ocean enquiries that your staff price by hand. Same idea as a quote, but with a workflow attached — submitted, being reviewed, priced, accepted or declined.

Everything about the shipment, including ports or airports where relevant

Container type for ocean shipments

Special requirements — dangerous goods, temperature control, customs

Which of your staff is handling it

The price they quoted, the underlying cost, and how long the price holds

Internal notes, which the customer never sees

## Shipping

### Bookings

Created the moment a customer commits to a price. This is the commercial record — the agreement that a shipment will happen at an agreed price.

A booking number

Which quote and which specific price they chose

The cost and the price, frozen at the moment of booking

Whether payment succeeded

Pickup details and confirmation from the carrier

The customer's own reference or purchase order number

### Shipments

Created once the carrier confirms and issues a tracking number. Where a booking is the agreement, a shipment is the physical thing moving. Kept separate because a booking can fail at the carrier after payment succeeded, and you need to be able to tell those situations apart.

Tracking number and carrier

Origin and destination, again as frozen copies

Weight and piece count

Current status — awaiting pickup, in transit, delivered, or a problem

Estimated and actual delivery dates, plus who signed for it

Where the shipping label, bill of lading, and customs paperwork are stored

### Tracking events

Every scan on a shipment's journey, one record each. These are only ever added, never edited — the history of where a shipment has been should not be rewritable.

What happened, in plain words — "Departed origin facility"

Where it happened

When the carrier says it happened

Whether it represents a problem rather than normal progress

## Problems

### Claims

One record per claim for loss, damage, shortage, or delay.

Claim number and the shipment or tracking number it relates to

Type of claim and the amount being claimed

The customer's description of what went wrong

Where it has got to — submitted, under review, filed with the carrier, settled

The amount actually approved, and the carrier's own claim reference

Notes the customer sees, and separate internal notes they do not

The system will refuse claims on shipments more than nine months old, and will not accept a claim for more than the declared value of the goods.

### Claim documents

The evidence — photos of damage, invoices, packing lists, inspection reports.

What kind of document it is

Who uploaded it and when

Where the file itself is stored

The files are not stored in the database itself — they sit in file storage, and the database holds a pointer to them. Access is through temporary links that expire, so a claim photo cannot be found by someone guessing a web address.

## Money

### Payment methods

Saved cards, belonging to the company rather than the individual person.

The QuickBooks token that stands in for the card

Card brand and last four digits, for display only

Expiry month and year, so the customer can be warned before it lapses

Which card is the default

### Payments

One record per attempt to charge a card, including failures. Failed attempts are kept deliberately — if a customer says they were charged twice, or a card was declined and they want to know why, that history is the answer.

Which booking it relates to and how much

QuickBooks's reference for the transaction

Whether it succeeded, failed, or was refunded

If it failed, the reason the card was declined

### Invoices

Covered in full in section 9.

## Settings and record-keeping

### Carriers

One record per carrier, controlling how the system treats them. Having this as data rather than buried in code means a carrier can be switched off in seconds if they have an outage, without anyone changing the website.

Carrier name and whether they are currently switched on

Whether they provide live pricing or are still being estimated

Which shipment types they can handle

A pointer to where their access credentials are kept — never the credentials themselves

### Markup rules

Your pricing tiers, stored as settings you can change rather than as code. The agreed starting point is a sliding scale — the highest markup on the smallest shipments, tapering down as the value rises.

When you change these, past quotes keep the rates that applied at the time. The old rules are retired rather than overwritten, so a quote from last year can still be explained.

### Activity log

A running record of significant events — who logged in, who accepted terms, who booked what, who changed a markup rule. Nobody looks at this day to day. It matters on the day something goes wrong and the question is what actually happened, or when FedEx asks for evidence that customers genuinely accepted their terms.

## Two conventions worth knowing

Money is stored as a whole number of cents. A price of $312.40 is stored as 31240. Computers make tiny rounding errors with decimal numbers, and across thousands of invoices those errors accumulate into real discrepancies. Working in whole cents removes the problem entirely.

Times are stored in a single global standard and converted for display. A shipment picked up at 9am in Toronto and delivered at 9am in Vancouver is stored unambiguously, and the screens show each in the right local time.

# 4. User accounts and signing in

## The important bit: we do not store passwords

Handling passwords properly is genuinely difficult and the consequences of getting it wrong are severe. Rather than building that ourselves, the portal hands the job to a specialist service — either Auth0 or Firebase, both of which do nothing but this, for thousands of companies.

The way to picture it is a bouncer at a door. The customer shows their credentials to the bouncer, not to us. The bouncer checks them and hands back a wristband. Our system only ever checks for a valid wristband. If IFF's database were ever exposed, there would be no passwords in it to steal, because there never were any.

This also gives us identity verification for free, which matters because FedEx requires it. Building that from scratch would be weeks of work.

## Signing up

Three steps, which is deliberate — asking for everything on one screen loses people.

Their details. Name, email, phone, and a password they set with the login service.

Their company. Business name and address. If their company already exists in the system, they can be attached to it rather than creating a duplicate.

The agreements. Your terms, FedEx's terms, and confirmation they are authorised to open the account.

Then verification: a code arrives by text or email, they type it back in, and the account is active. They cannot book a shipment until this is done.

## People and companies are separate

This distinction is worth being clear about because it affects how discounts work. A company is the business — it holds the billing address, the payment terms, the negotiated discount, and the saved cards. A user is a person who can log in, and belongs to exactly one company.

So if a customer has three people who book shipments, all three sign up individually, all three attach to the same company, and all three automatically get that company's negotiated rate. They can also all see each other's shipments, which is usually what a business wants — one person can chase a delivery a colleague booked.

## Who can see what

# 5. The My Shipments page

## What the customer sees

A list of every shipment their company has booked, newest first. Each row shows the tracking number, where it went, which carrier, what it weighed, when it was booked, the expected delivery date, what it cost, and where it currently is.

They can search by tracking number or destination, filter to just those in transit or just those delivered, and click any row to expand it for the full detail — plus buttons to track it or download the paperwork again.

## Where that information comes from

A shipment record is created at the moment the carrier confirms a booking, and holds:

The tracking number the carrier issued

Which carrier and which service level

Full origin and destination, frozen at booking time

Weight, pieces, and what was being shipped

Current status, and when that status last changed

Expected delivery date, actual delivery date, and who signed

Where the label, bill of lading, and any customs paperwork are stored

The price shown comes from the booking record rather than the shipment, which is why the two are kept separate: the booking is the commercial agreement, the shipment is the physical movement. Occasionally a payment succeeds but the carrier rejects the shipment, and separating the two means you can see exactly that situation rather than being left with a confusing half-record.

## The chain behind one row

Every shipment traces back through a chain, which is what makes questions answerable later:

Quote            "What would it cost to send this to Chicago?"

└─ Options     Five carrier prices came back

└─ Booking     "I'll take the FedEx one" — paid $312.40

└─ Shipment    Tracking 1Z999AA..., picked up May 20

├─ Tracking events   Every scan along the way

└─ Claim             Only if something went wrong

Because the chain is intact, you can answer "why did this customer pay this much" months later by walking back to the original quote and seeing exactly which carrier prices were on the table and what markup was applied.

## Statuses

These are updated automatically from the carriers rather than typed in by anyone. Exception is the one worth watching — it is the trigger for your team to get involved before the customer notices and calls.

# 6. How tracking works

## How the system knows which carrier to ask

Every shipment record stores which carrier it went with. When a tracking number is looked up, the system finds that shipment, reads the carrier from it, and asks that carrier and no other. There is no guessing and no asking five carriers hoping one recognises the number.

Customer enters tracking number 1Z999AA1234567890

│

▼

Find that shipment in the database

│

▼

The record says: carrier = FedEx

│

▼

Ask FedEx for the tracking history

│

▼

Save the events and show the timeline

If a customer types a tracking number for a shipment IFF did not book, the system will not find it and says so, rather than attempting to track something it knows nothing about.

## Adding carriers does not complicate this

Each carrier gets what is essentially a translator — a small piece of software that knows how to talk to that particular company and convert their responses into a common format. FedEx says "DL" for delivered, another carrier might say "DELIVERED", and a third something else again; the translator turns all of them into the same thing before it reaches the rest of the system.

This means adding Day & Ross later is a self-contained piece of work — write their translator, switch them on. Nothing about the quoting, tracking, or booking screens needs to change, which is what keeps the cost of adding carriers low.

## Two ways tracking updates

On demand: the customer opens the tracking screen, and the system fetches the latest from the carrier there and then. Always current, but only happens when someone is looking.

In the background: a scheduled job runs through active shipments every hour or so and updates them whether anyone is watching or not. This is what makes the shipments list accurate the moment it loads, and what lets the system email a customer that their shipment was delivered without them having to check.

Both are worth having. Only shipments still moving get polled — once something is delivered, there is nothing further to ask about, and carriers do not appreciate being asked anyway.

## The timeline

Each scan the carrier reports becomes one entry, showing what happened, where, and when, newest at the top. These are only ever added, never edited or removed — if a delivery is ever disputed, that history needs to be trustworthy.

One practical detail: carriers sometimes send the same scan twice. The system checks whether it already has an identical event before adding a new one, so the customer does not see "Departed origin facility" listed three times.

# 7. Getting a quote

## The six shipment types

The customer starts by choosing what they are sending. This choice changes which questions they are asked next, and whether they get a price on screen or a request goes to your team.

## What each type asks for

Only the relevant questions appear.

Envelope — weight, pieces, and dimensions.

Parcel — weight, pieces, and dimensions.

LTL Freight — weight, pieces, dimensions, and freight class.

FTL, Air, Ocean — weight, rough dimensions, commodity, ready date, and for air and ocean the ports involved.

Freight class is the one that trips customers up. It is a standard industry number from 50 to 500 describing how difficult goods are to carry — dense, sturdy items are low, bulky or fragile ones are high, and it materially affects price. It is worth adding help text explaining it, since customers who guess wrong get quotes that do not hold up. I will explain this one after. We can calculate freight class using a density formula.

## What happens when they press the button

For the three instant types, in the few seconds the customer waits:

Every carrier is asked for a price at the same time, not one after another.

Each response is checked, and any carrier that fails or takes too long is quietly dropped rather than holding up the rest.

Your markup is applied to each price, using the tier that matches that carrier's cost.

Any discount for that customer is applied on top.

Delivery dates are worked out, skipping weekends.

Results are sorted cheapest first and the best one is flagged.

## Quotes expire at the end of the day

A quote can be booked until 11:59pm on the day it was created. After that the customer has to request a fresh one.

This is protection, not inconvenience. Carrier rates move with fuel surcharges and capacity, and without an expiry a customer could get a quote in January and try to book it in June at a price that now loses you money on every shipment.

The expiry is enforced in two places: the button greys out on screen, and — more importantly — the server checks again when someone actually tries to book. The screen check is a courtesy; the server check is what makes it real. A screen check alone can be bypassed by anyone technical enough to want to.

## The spot rate path

For full truckload, air, and ocean, the customer fills in a fuller form and submits it. They see confirmation that IFF will respond within a few business hours. The request appears in your staff queue, someone works out a price and enters it, and the customer is emailed. They can then accept it, and from that point it behaves like any other booking.

Spot quotes carry their own expiry date, set by whoever prices them, because air and ocean rates can move within days.

# 8. The dashboard

The first screen after signing in. Three parts.

## The four figures across the top

None of these are stored anywhere. They are worked out fresh each time the page loads, by counting the underlying records. That is deliberate — a stored total is a total that can drift out of step with reality when a shipment is cancelled or refunded. Calculating on demand means the numbers are always right.

If the dashboard ever becomes slow because a customer has thousands of shipments, the fix is to cache these figures for a few minutes — but that is a problem worth having and not worth solving in advance.

## Recent quotes

Their last few price requests, showing the route, the best carrier and price, the estimated delivery, and when it was quoted.

The useful part is the Book button on each row. A customer who got a price this morning, checked with a colleague, and came back at three can book straight from here without re-entering anything. Rows from today show a live countdown to expiry; rows from previous days show as expired with the button disabled.

This table exists because it removes friction at exactly the moment a customer has already decided to buy. It reads from the quote records and their stored options — nothing new is stored for it.

## Recent shipments

The last five bookings with their current status, and a link through to the full list. Same data as the My Shipments page, just the newest few.

# 9. Invoice history

## What an invoice is here

For a customer paying by card, the invoice is really a receipt — the money is already collected, and the document exists for their accounting records. If you later offer regular customers monthly terms, the same records become genuine invoices that are issued, fall due, and get paid.

Each invoice record holds:

An invoice number, sequential and never reused

Which company it is for

Which bookings it covers — one, or many

Subtotal, tax, and total

Currency

Status — issued, paid, overdue, or cancelled

When it was issued, when it is due, when it was paid

Where the PDF is stored

## One invoice can cover several shipments

A card customer typically gets one invoice per booking. A monthly-terms customer gets one invoice covering everything they shipped that month. The system handles both because an invoice holds a list of bookings rather than just one.

This is why the amounts are copied onto the invoice rather than looked up live from the bookings each time it is viewed. Once issued, an invoice is a fixed document — if a booking were later adjusted, the invoice already sent to the customer must not silently change to a different total.

## The PDF

Generated once when the invoice is issued and stored as a file, with the database holding a pointer to it. Downloading uses a temporary link that expires, so an invoice cannot be reached by anyone guessing a web address.

## Tax

Worth flagging as an open question rather than an answered one. Canadian freight tax depends on origin province, destination, and whether the shipment crosses the border, and it is not something to guess at. Confirm the treatment with your accountant before this stage is built — it is far cheaper to get right first time than to correct across a year of issued invoices.

| One thing worth understanding early IFF is what FedEx calls an "Integrator" — a company that lets other businesses reach FedEx through its own website. That classification comes with requirements FedEx will check before granting access to their live pricing: customers must see and accept FedEx's terms, must verify their identity with a code sent to their phone or email, and addresses must be checked before booking. These are not optional, and FedEx reviews screenshots of the finished screens before approving. |
| --- |

| Area | Tables | Purpose |
| --- | --- | --- |
| Who your customers are | Companies, Users, Addresses | Businesses, the people who log in, and their saved addresses. |
| Pricing | Quotes, Quote options, Spot requests | Every price request and the prices that came back. |
| Shipping | Bookings, Shipments, Tracking events | Confirmed orders, the physical shipments, and their scan history. |
| Problems | Claims, Claim documents | Loss and damage claims and the evidence attached. |
| Money | Payment methods, Payments, Invoices | Saved cards, charges taken, and billing documents. |
| Settings | Carriers, Markup rules, Activity log | How the system is configured and a record of what happened. |

| Why old shipments keep their own copy of the address When a shipment is booked, the system takes a photocopy of the address rather than a link to it. If a customer later corrects a typo in their saved address, every past shipment would otherwise silently change to show an address the goods never actually went to. Keeping a frozen copy means your shipping history stays truthful — which matters if a delivery is ever disputed. |
| --- |

| Both numbers get stored, always Every one of these records keeps the carrier's cost alongside the customer's price. Without the cost figure you cannot tell what margin you actually made, cannot check a carrier invoice against what you were quoted, and cannot explain a historical price if a customer queries it. Storing the markup percentage as well means a quote from six months ago is still explainable after you have changed your rates twice. |
| --- |

| Card numbers are not stored anywhere in IFF systems When a customer saves a card, the card details go straight from their browser to QuickBooks. QuickBooks keeps the card and hands back a token — a meaningless reference like "pm_1ABC" that only works from your account and cannot be used to make a purchase anywhere else. That token is what gets stored, along with the card brand and last four digits so the customer recognises which card is which. This is not caution for its own sake: storing real card numbers would put IFF under the full weight of payment card industry regulation — annual audits, quarterly security scans, and direct liability if there were ever a breach. Tokenising avoids essentially all of that, and there is no situation where storing the real number would be useful enough to justify it. |
| --- |

| Carrier cost | Our markup | Worked example |
| --- | --- | --- |
| Up to $100 | 70% | Costs you $80, customer pays $136 |
| $100 to $250 | 55% | Costs you $200, customer pays $310 |
| $250 to $500 | 40% | Costs you $400, customer pays $560 |
| $500 to $1,000 | 30% | Costs you $800, customer pays $1,040 |
| $1,000 to $2,500 | 20% | Costs you $2,000, customer pays $2,400 |
| Over $2,500 | 15% | Costs you $4,000, customer pays $4,600 |

| Role | What they can do |
| --- | --- |
| Customer | Quote, book, track, and claim — but only for their own company. |
| Company admin | The same, plus manage saved cards and the address book. |
| IFF staff | Price spot requests, process claims, view all customers. |
| IFF admin | Everything, including changing markup rules and customer discounts. |

| A security point worth insisting on The single most common way portals like this leak data is not clever hacking — it is that a logged-in customer changes a number in the web address and sees somebody else's shipment. Being logged in proves who someone is; it does not decide what they are allowed to see. Every time the system fetches a record, it must check that record belongs to the requester's company before showing it. |
| --- |

| Status | Meaning |
| --- | --- |
| Pending pickup | Booked and paid, carrier has not collected yet. |
| Picked up | Collected from the origin. |
| In transit | On its way. |
| Out for delivery | On the delivery vehicle today. |
| Delivered | Signed for and complete. |
| Exception | Something went wrong — delay, damage, refused delivery, bad address. |
| Returned | Coming back to the sender. |

| Type | What it covers | Result |
| --- | --- | --- |
| Envelope | Documents and letters. Under a pound. | Instant price |
| Parcel | Boxes and packages up to about 150 lbs. | Instant price |
| LTL Freight | Pallets sharing a truck with other companies' goods. | Instant price |
| FTL Freight | A full truck for one customer. | Your team prices it |
| Air Freight | Import and export by air. | Your team prices it |
| Ocean Freight | Container shipping, part or full container. | Your team prices it |

| Where the markup is calculated matters The markup is applied on IFF's server, before the prices are sent to the customer's browser. Anything sent to a browser can be inspected by a moderately curious customer — so if the calculation happened there, your margin would be visible to anyone who cared to look. The current prototype does calculate it in the browser, purely so it could be demonstrated without a server. That must move before real customers use it, and it is flagged for your developer. |
| --- |

| Figure | Where it comes from |
| --- | --- |
| Shipments this month | Counted from their shipment records for the current month. |
| Total spent | Added up from bookings in the current month. |
| In transit | Counted from shipments not yet delivered. |
| Saved versus list rate | The difference between what they paid and standard published rates. |
