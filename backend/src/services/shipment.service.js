const prisma = require('../config/database');
const { generateTrackingNumber } = require('../utils/trackingGenerator');
const { NotFoundError } = require('../utils/errors');

// Called from booking.service.js immediately after a Booking is confirmed. Synchronous today
// because carriers are mocked — this is the natural seam to make async once real carrier
// booking APIs exist (e.g. deferred to a queue/webhook waiting on carrier confirmation).
async function createShipmentForBooking(tx, booking, quote, selectedRate) {
  const trackingNumber = await generateTrackingNumber();

  return tx.shipment.create({
    data: {
      trackingNumber,
      userId: booking.userId,
      companyId: booking.companyId,
      bookingId: booking.id,
      carrierId: booking.carrierId,
      carrierName: booking.carrierName,
      serviceName: booking.serviceName,
      shipmentType: quote.shipmentType,
      originCity: quote.originCity,
      originPostal: quote.originPostal,
      originCountry: quote.originCountry,
      destCity: quote.destCity,
      destPostal: quote.destPostal,
      destCountry: quote.destCountry,
      weight: quote.weight,
      pieces: quote.pieces,
      dimL: quote.dimL,
      dimW: quote.dimW,
      dimH: quote.dimH,
      freightClass: quote.freightClass,
      currency: quote.currency,
      declaredValue: quote.declaredValue,
      commodity: quote.commodity,
      accessorials: quote.accessorials,
      status: 'pending',
      estimatedDelivery: selectedRate.estimatedDelivery,
      trackingEvents: {
        create: {
          event: 'Booked',
          location: quote.originCity || quote.originPostal,
          timestamp: new Date(),
          description: 'Shipment booked - awaiting carrier pickup',
        },
      },
    },
    include: { trackingEvents: true },
  });
}

async function getUserShipments(userId, { status, page = 1, limit = 10, search } = {}) {
  const skip = (page - 1) * limit;
  const where = { userId };

  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { trackingNumber: { contains: search } },
      { carrierName: { contains: search } },
      { originCity: { contains: search } },
      { destCity: { contains: search } },
    ];
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { bookedAt: 'desc' },
      skip,
      take: limit,
      include: { booking: { select: { bookingNumber: true, sellRate: true } } },
    }),
    prisma.shipment.count({ where }),
  ]);

  return { shipments, pagination: { page, limit, total } };
}

async function getShipmentById(shipmentId, userId) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, userId },
    include: {
      trackingEvents: { orderBy: { timestamp: 'desc' } },
      booking: true,
    },
  });
  if (!shipment) throw new NotFoundError('Shipment');
  return shipment;
}

module.exports = { createShipmentForBooking, getUserShipments, getShipmentById };
