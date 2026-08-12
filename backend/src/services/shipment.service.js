const Shipment = require('../models/Shipment');
const TrackingEvent = require('../models/TrackingEvent');
const { generateTrackingNumber } = require('../utils/trackingGenerator');
const { NotFoundError } = require('../utils/errors');

// Called from booking.service.js immediately after a Booking is confirmed. Synchronous today
// because carriers are mocked — this is the natural seam to make async once real carrier
// booking APIs exist (e.g. deferred to a queue/webhook waiting on carrier confirmation).
async function createShipmentForBooking(session, booking, quote, selectedRate) {
  const trackingNumber = await generateTrackingNumber();

  const [shipment] = await Shipment.create([{
    trackingNumber,
    user: booking.user,
    company: booking.company,
    booking: booking._id,
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
  }], { session });

  await TrackingEvent.create([{
    shipment: shipment._id,
    event: 'Booked',
    location: quote.originCity || quote.originPostal,
    timestamp: new Date(),
    description: 'Shipment booked - awaiting carrier pickup',
  }], { session });

  return shipment;
}

async function getUserShipments(userId, { status, page = 1, limit = 10, search } = {}) {
  const skip = (page - 1) * limit;
  const where = { user: userId };

  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    const regex = new RegExp(search, 'i');
    where.$or = [
      { trackingNumber: regex },
      { carrierName: regex },
      { originCity: regex },
      { destCity: regex },
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
  const shipment = await Shipment.findOne({ _id: shipmentId, user: userId }).populate('booking');
  if (!shipment) throw new NotFoundError('Shipment');

  const trackingEvents = await TrackingEvent.find({ shipment: shipment._id }).sort({ timestamp: -1 });
  const obj = shipment.toObject({ virtuals: true });
  obj.trackingEvents = trackingEvents;
  return obj;
}

module.exports = { createShipmentForBooking, getUserShipments, getShipmentById };
