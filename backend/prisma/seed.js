const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const bookingService = require('../src/services/booking.service');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create company
  const company = await prisma.company.create({
    data: {
      name: 'Acme Corp',
      country: 'CA',
      province: 'Ontario',
      city: 'Toronto',
      postalCode: 'M5V 3A8',
      shippingType: 'LTL Freight',
    },
  });

  // Create demo user (john@acmecorp.com / demo1234) — customer
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.create({
    data: {
      email: 'john@acmecorp.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Smith',
      phone: '416 555 0100',
      role: 'customer',
      companyId: company.id,
      notifications: {
        create: {
          shipmentBooked: true,
          outForDelivery: true,
          delivered: true,
          exceptionsDelays: true,
          spotRateResponses: true,
          claimsUpdates: true,
          promotional: false,
        },
      },
    },
  });

  // Same company, company_admin role — manages saved cards/address book for Acme Corp
  const janeHash = await bcrypt.hash('demo1234', 12);
  await prisma.user.create({
    data: {
      email: 'jane@acmecorp.com',
      passwordHash: janeHash,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '416 555 0101',
      role: 'company_admin',
      companyId: company.id,
      notifications: { create: {} },
    },
  });

  // IFF staff — prices spot requests, processes claims
  const staffHash = await bcrypt.hash('staff1234', 12);
  await prisma.user.create({
    data: {
      email: 'staff@iffcargo.com',
      passwordHash: staffHash,
      firstName: 'Sam',
      lastName: 'Staff',
      role: 'iff_staff',
      notifications: { create: {} },
    },
  });

  // IFF admin — everything, including markup rules and customer discounts
  const adminHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.create({
    data: {
      email: 'admin@iffcargo.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'IFF',
      role: 'iff_admin',
      notifications: { create: {} },
    },
  });

  // Create payment methods
  await prisma.paymentMethod.create({
    data: { userId: user.id, type: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2027, isDefault: true },
  });
  await prisma.paymentMethod.create({
    data: { userId: user.id, type: 'mastercard', last4: '8888', expiryMonth: 6, expiryYear: 2028, isDefault: false },
  });

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // A browsable, unbooked quote (5 carrier rates, none selected yet)
  await prisma.quote.create({
    data: {
      quoteNumber: 'Q-2026-0001',
      userId: user.id,
      shipmentType: 'ltl',
      originCity: 'Toronto',
      originPostal: 'M5V3A8',
      originCountry: 'CA',
      destCity: 'Chicago',
      destPostal: '60601',
      destCountry: 'US',
      weight: 500,
      pieces: 2,
      dimL: 48, dimW: 40, dimH: 48,
      freightClass: '70',
      currency: 'CAD',
      pickupDate: '2026-07-10',
      expiresAt: endOfToday,
      status: 'active',
      rates: {
        create: [
          { carrierId: 'fedex', carrierName: 'FedEx', serviceName: 'Freight Economy', baseRate: 245.80, displayRate: 319.54, transitDays: 4, estimatedDelivery: '2026-07-16', isLiveRate: false, isBestRate: true },
          { carrierId: 'dayross', carrierName: 'Day & Ross', serviceName: 'Standard LTL', baseRate: 268.50, displayRate: 349.05, transitDays: 5, estimatedDelivery: '2026-07-17', isLiveRate: false, isBestRate: false },
          { carrierId: 'manitoulin', carrierName: 'Manitoulin', serviceName: 'Direct Freight', baseRate: 282.30, displayRate: 367.00, transitDays: 4, estimatedDelivery: '2026-07-16', isLiveRate: false, isBestRate: false },
          { carrierId: 'xpo', carrierName: 'XPO Logistics', serviceName: 'LTL Standard', baseRate: 298.40, displayRate: 387.92, transitDays: 5, estimatedDelivery: '2026-07-17', isLiveRate: false, isBestRate: false },
          { carrierId: 'polaris', carrierName: 'Polaris', serviceName: 'Freight Standard', baseRate: 312.10, displayRate: 405.73, transitDays: 6, estimatedDelivery: '2026-07-18', isLiveRate: false, isBestRate: false },
        ],
      },
    },
  });

  // Booked shipments — each goes through a real Quote -> Booking -> Shipment chain.
  // Fixtures with a specific historical status (delivered/in_transit) are assembled
  // directly since the real booking flow can't yet produce backdated carrier-scan
  // history on its own. One fixture (XPO, still "pending") runs through the real
  // bookingService.createBooking() end-to-end, exercising the actual code path.
  const bookedDate = new Date('2026-06-25T10:00:00Z');

  async function createHistoricalFixture(quoteSeq, bookingSeq, f) {
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: `Q-2026-${quoteSeq}`,
        userId: user.id,
        shipmentType: f.type,
        originCity: f.origCity, originPostal: f.origPostal, originCountry: f.origCountry,
        destCity: f.destCity, destPostal: f.destPostal, destCountry: f.destCountry,
        weight: f.weight, pieces: f.pieces,
        currency: 'CAD',
        expiresAt: endOfToday,
        status: 'booked',
        rates: {
          create: [{
            carrierId: f.carrier, carrierName: f.carrierName, serviceName: f.service,
            baseRate: f.baseRate, displayRate: f.displayRate, transitDays: 4,
            estimatedDelivery: f.estDelivery, isLiveRate: false, isBestRate: true,
          }],
        },
      },
      include: { rates: true },
    });
    const rate = quote.rates[0];

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK-2026-${bookingSeq}`,
        quoteId: quote.id,
        quoteRateId: rate.id,
        userId: user.id,
        companyId: company.id,
        carrierId: f.carrier, carrierName: f.carrierName, serviceName: f.service,
        costRate: f.baseRate, sellRate: f.displayRate, currency: 'CAD',
        status: 'confirmed',
      },
    });

    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: f.tracking,
        userId: user.id,
        companyId: company.id,
        bookingId: booking.id,
        carrierId: f.carrier, carrierName: f.carrierName, serviceName: f.service,
        shipmentType: f.type,
        originCity: f.origCity, originPostal: f.origPostal, originCountry: f.origCountry,
        destCity: f.destCity, destPostal: f.destPostal, destCountry: f.destCountry,
        weight: f.weight, pieces: f.pieces,
        currency: 'CAD',
        status: f.status,
        estimatedDelivery: f.estDelivery,
        actualDelivery: f.actualDelivery,
      },
    });

    const events = [
      { event: 'Booked', location: f.origCity, timestamp: bookedDate, description: 'Shipment booked - awaiting carrier pickup' },
    ];
    if (f.status !== 'pending') {
      events.push({ event: 'Picked up', location: f.origCity, timestamp: new Date(bookedDate.getTime() + 86400000), description: 'Package picked up by carrier' });
      events.push({ event: 'In transit', location: 'Distribution Center', timestamp: new Date(bookedDate.getTime() + 172800000), description: 'Shipment in transit to destination' });
    }
    if (f.status === 'delivered') {
      events.push({ event: 'Out for delivery', location: f.destCity, timestamp: new Date(bookedDate.getTime() + 259200000), description: 'Out for delivery' });
      events.push({ event: 'Delivered', location: f.destCity, timestamp: new Date(bookedDate.getTime() + 345600000), description: 'Delivered - signed by receiver' });
    }
    for (const evt of events) {
      await prisma.trackingEvent.create({ data: { shipmentId: shipment.id, ...evt } });
    }
  }

  await createHistoricalFixture('0002', '0001', { tracking: 'IFF-2026-00001', carrier: 'fedex', carrierName: 'FedEx', service: 'Freight Economy', type: 'ltl', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Chicago', destPostal: '60601', destCountry: 'US', weight: 500, pieces: 2, baseRate: 245.80, displayRate: 319.54, status: 'delivered', estDelivery: '2026-06-28', actualDelivery: '2026-06-27' });
  await createHistoricalFixture('0003', '0002', { tracking: 'IFF-2026-00002', carrier: 'dayross', carrierName: 'Day & Ross', service: 'Direct LTL', type: 'ltl', origCity: 'Montreal', origPostal: 'H2X1Y4', origCountry: 'CA', destCity: 'Vancouver', destPostal: 'V6B2W2', destCountry: 'CA', weight: 350, pieces: 1, baseRate: 412.50, displayRate: 536.25, status: 'delivered', estDelivery: '2026-06-30', actualDelivery: '2026-06-30' });
  await createHistoricalFixture('0004', '0003', { tracking: 'IFF-2026-00003', carrier: 'fedex', carrierName: 'FedEx', service: 'Ground', type: 'parcel', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'New York', destPostal: '10001', destCountry: 'US', weight: 12, pieces: 1, baseRate: 45.20, displayRate: 76.84, status: 'in_transit', estDelivery: '2026-07-09', actualDelivery: null });
  await createHistoricalFixture('0005', '0004', { tracking: 'IFF-2026-00004', carrier: 'manitoulin', carrierName: 'Manitoulin', service: 'Consolidated LTL', type: 'ltl', origCity: 'Calgary', origPostal: 'T2P1J9', origCountry: 'CA', destCity: 'Toronto', destPostal: 'M5V3A8', destCountry: 'CA', weight: 820, pieces: 3, baseRate: 580.00, displayRate: 754.00, status: 'in_transit', estDelivery: '2026-07-11', actualDelivery: null });
  await createHistoricalFixture('0006', '0005', { tracking: 'IFF-2026-00005', carrier: 'polaris', carrierName: 'Polaris', service: 'Freight Select', type: 'ltl', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Edmonton', destPostal: 'T5J0N3', destCountry: 'CA', weight: 1200, pieces: 4, baseRate: 890.00, displayRate: 1157.00, status: 'in_transit', estDelivery: '2026-07-12', actualDelivery: null });

  // Real end-to-end booking flow — proves Quote -> Booking -> Shipment actually works
  const xpoQuote = await prisma.quote.create({
    data: {
      quoteNumber: 'Q-2026-0007',
      userId: user.id,
      shipmentType: 'ltl',
      originCity: 'Toronto', originPostal: 'M5V3A8', originCountry: 'CA',
      destCity: 'Los Angeles', destPostal: '90001', destCountry: 'US',
      weight: 650, pieces: 2,
      currency: 'CAD',
      expiresAt: endOfToday,
      status: 'active',
      rates: {
        create: [{
          carrierId: 'xpo', carrierName: 'XPO Logistics', serviceName: 'LTL Priority',
          baseRate: 720.00, displayRate: 936.00, transitDays: 5,
          estimatedDelivery: '2026-07-14', isLiveRate: false, isBestRate: true,
        }],
      },
    },
    include: { rates: true },
  });
  await bookingService.createBooking(user.id, {
    quoteId: xpoQuote.id,
    quoteRateId: xpoQuote.rates[0].id,
  });

  await createHistoricalFixture('0008', '0007', { tracking: 'IFF-2026-00007', carrier: 'fedex', carrierName: 'FedEx', service: 'Express Saver', type: 'envelope', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Ottawa', destPostal: 'K1A0A9', destCountry: 'CA', weight: 0.5, pieces: 1, baseRate: 22.50, displayRate: 38.25, status: 'delivered', estDelivery: '2026-07-02', actualDelivery: '2026-07-02' });

  // Create claims
  const claimsData = [
    { claimNumber: 'CLM-2026-0001', tracking: 'IFF-2026-00001', carrier: 'fedex', carrierName: 'FedEx', type: 'Damaged goods', amount: 1240, desc: 'Box crushed during transit, 3 items inside damaged', status: 'under_review' },
    { claimNumber: 'CLM-2026-0002', tracking: 'IFF-2026-00002', carrier: 'dayross', carrierName: 'Day & Ross', type: 'Shortage', amount: 380, desc: '2 of 4 boxes missing from pallet', status: 'approved' },
    { claimNumber: 'CLM-2026-0003', tracking: 'IFF-2026-00003', carrier: 'fedex', carrierName: 'FedEx', type: 'Lost shipment', amount: 2100, desc: 'Package never arrived, last scan was 10 days ago', status: 'under_review' },
    { claimNumber: 'CLM-2026-0004', tracking: 'IFF-2026-00004', carrier: 'manitoulin', carrierName: 'Manitoulin', type: 'Delay', amount: 500, desc: 'Delivery was 5 business days late, causing production delays', status: 'closed' },
  ];

  for (const c of claimsData) {
    await prisma.claim.create({
      data: {
        claimNumber: c.claimNumber,
        userId: user.id,
        trackingNumber: c.tracking,
        carrierId: c.carrier,
        carrierName: c.carrierName,
        claimType: c.type,
        amountClaimed: c.amount,
        currency: 'CAD',
        description: c.desc,
        status: c.status,
      },
    });
  }

  // Create invoices
  const invoicesData = [
    { number: 'INV-2026-0001', amount: 4218.00, status: 'paid', date: '2026-07-01' },
    { number: 'INV-2026-0002', amount: 3842.50, status: 'paid', date: '2026-06-01' },
    { number: 'INV-2026-0003', amount: 5120.75, status: 'paid', date: '2026-05-01' },
    { number: 'INV-2026-0004', amount: 2915.00, status: 'paid', date: '2026-04-01' },
    { number: 'INV-2026-0005', amount: 4680.25, status: 'paid', date: '2026-03-01' },
  ];

  for (const inv of invoicesData) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: inv.number,
        userId: user.id,
        totalAmount: inv.amount,
        currency: 'CAD',
        status: inv.status,
        issuedAt: new Date(inv.date),
        paidAt: inv.status === 'paid' ? new Date(new Date(inv.date).getTime() + 7 * 86400000) : null,
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log('Customer:      john@acmecorp.com / demo1234');
  console.log('Company admin: jane@acmecorp.com / demo1234');
  console.log('IFF staff:     staff@iffcargo.com / staff1234');
  console.log('IFF admin:     admin@iffcargo.com / admin1234');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
