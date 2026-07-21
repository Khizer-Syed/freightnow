const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

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

  // Create demo user (john@acmecorp.com / demo1234)
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

  // Create admin user
  const adminHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.create({
    data: {
      email: 'admin@iffcargo.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'IFF',
      role: 'admin',
      notifications: { create: {} },
    },
  });

  // Create payment methods
  const visa = await prisma.paymentMethod.create({
    data: { userId: user.id, type: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2027, isDefault: true },
  });
  await prisma.paymentMethod.create({
    data: { userId: user.id, type: 'mastercard', last4: '8888', expiryMonth: 6, expiryYear: 2028, isDefault: false },
  });

  // Create quotes
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const quote1 = await prisma.quote.create({
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
    include: { rates: true },
  });

  // Create shipments with tracking events
  const shipments = [
    { tracking: 'IFF-2026-00001', carrier: 'fedex', carrierName: 'FedEx', service: 'Freight Economy', type: 'ltl', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Chicago', destPostal: '60601', destCountry: 'US', weight: 500, pieces: 2, baseRate: 245.80, displayRate: 319.54, status: 'delivered', estDelivery: '2026-06-28', actualDelivery: '2026-06-27' },
    { tracking: 'IFF-2026-00002', carrier: 'dayross', carrierName: 'Day & Ross', service: 'Direct LTL', type: 'ltl', origCity: 'Montreal', origPostal: 'H2X1Y4', origCountry: 'CA', destCity: 'Vancouver', destPostal: 'V6B2W2', destCountry: 'CA', weight: 350, pieces: 1, baseRate: 412.50, displayRate: 536.25, status: 'delivered', estDelivery: '2026-06-30', actualDelivery: '2026-06-30' },
    { tracking: 'IFF-2026-00003', carrier: 'fedex', carrierName: 'FedEx', service: 'Ground', type: 'parcel', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'New York', destPostal: '10001', destCountry: 'US', weight: 12, pieces: 1, baseRate: 45.20, displayRate: 76.84, status: 'in_transit', estDelivery: '2026-07-09', actualDelivery: null },
    { tracking: 'IFF-2026-00004', carrier: 'manitoulin', carrierName: 'Manitoulin', service: 'Consolidated LTL', type: 'ltl', origCity: 'Calgary', origPostal: 'T2P1J9', origCountry: 'CA', destCity: 'Toronto', destPostal: 'M5V3A8', destCountry: 'CA', weight: 820, pieces: 3, baseRate: 580.00, displayRate: 754.00, status: 'in_transit', estDelivery: '2026-07-11', actualDelivery: null },
    { tracking: 'IFF-2026-00005', carrier: 'polaris', carrierName: 'Polaris', service: 'Freight Select', type: 'ltl', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Edmonton', destPostal: 'T5J0N3', destCountry: 'CA', weight: 1200, pieces: 4, baseRate: 890.00, displayRate: 1157.00, status: 'in_transit', estDelivery: '2026-07-12', actualDelivery: null },
    { tracking: 'IFF-2026-00006', carrier: 'xpo', carrierName: 'XPO Logistics', service: 'LTL Priority', type: 'ltl', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Los Angeles', destPostal: '90001', destCountry: 'US', weight: 650, pieces: 2, baseRate: 720.00, displayRate: 936.00, status: 'pending', estDelivery: '2026-07-14', actualDelivery: null },
    { tracking: 'IFF-2026-00007', carrier: 'fedex', carrierName: 'FedEx', service: 'Express Saver', type: 'envelope', origCity: 'Toronto', origPostal: 'M5V3A8', origCountry: 'CA', destCity: 'Ottawa', destPostal: 'K1A0A9', destCountry: 'CA', weight: 0.5, pieces: 1, baseRate: 22.50, displayRate: 38.25, status: 'delivered', estDelivery: '2026-07-02', actualDelivery: '2026-07-02' },
  ];

  for (const s of shipments) {
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: s.tracking,
        userId: user.id,
        carrierId: s.carrier,
        carrierName: s.carrierName,
        serviceName: s.service,
        shipmentType: s.type,
        originCity: s.origCity,
        originPostal: s.origPostal,
        originCountry: s.origCountry,
        destCity: s.destCity,
        destPostal: s.destPostal,
        destCountry: s.destCountry,
        weight: s.weight,
        pieces: s.pieces,
        currency: 'CAD',
        baseRate: s.baseRate,
        displayRate: s.displayRate,
        status: s.status,
        estimatedDelivery: s.estDelivery,
        actualDelivery: s.actualDelivery,
      },
    });

    // Add tracking events based on status
    const events = [];
    const bookedDate = new Date('2026-06-25T10:00:00Z');

    events.push({ event: 'Booked', location: s.origCity, timestamp: bookedDate, description: 'Shipment booked - awaiting carrier pickup' });

    if (s.status !== 'pending') {
      events.push({ event: 'Picked up', location: s.origCity, timestamp: new Date(bookedDate.getTime() + 86400000), description: 'Package picked up by carrier' });
      events.push({ event: 'In transit', location: 'Distribution Center', timestamp: new Date(bookedDate.getTime() + 172800000), description: 'Shipment in transit to destination' });
    }

    if (s.status === 'delivered') {
      events.push({ event: 'Out for delivery', location: s.destCity, timestamp: new Date(bookedDate.getTime() + 259200000), description: 'Out for delivery' });
      events.push({ event: 'Delivered', location: s.destCity, timestamp: new Date(bookedDate.getTime() + 345600000), description: 'Delivered - signed by receiver' });
    }

    for (const evt of events) {
      await prisma.trackingEvent.create({
        data: { shipmentId: shipment.id, ...evt },
      });
    }
  }

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
  console.log('Demo user: john@acmecorp.com / demo1234');
  console.log('Admin user: admin@iffcargo.com / admin1234');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
