const prisma = require('../config/database');
const { generateTrackingNumber } = require('../utils/trackingGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { addBusinessDays, formatDate } = require('../utils/dateHelpers');

async function bookShipment(userId, { quoteId, rateId }) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, userId },
    include: { rates: true },
  });
  if (!quote) throw new NotFoundError('Quote');
  if (quote.status === 'expired') throw new ValidationError('This quote has expired');
  if (quote.status === 'booked') throw new ValidationError('This quote has already been booked');

  const selectedRate = quote.rates.find(r => r.id === rateId);
  if (!selectedRate) throw new NotFoundError('Rate');

  const trackingNumber = await generateTrackingNumber();
  const estimatedDelivery = selectedRate.estimatedDelivery;

  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber,
      userId,
      quoteId,
      carrierId: selectedRate.carrierId,
      carrierName: selectedRate.carrierName,
      serviceName: selectedRate.serviceName,
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
      baseRate: selectedRate.baseRate,
      displayRate: selectedRate.displayRate,
      status: 'pending',
      estimatedDelivery,
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

  // Mark quote as booked
  await prisma.quote.update({ where: { id: quoteId }, data: { status: 'booked' } });

  return shipment;
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
    }),
    prisma.shipment.count({ where }),
  ]);

  return { shipments, pagination: { page, limit, total } };
}

async function getShipmentById(shipmentId, userId) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, userId },
    include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
  });
  if (!shipment) throw new NotFoundError('Shipment');
  return shipment;
}

module.exports = { bookShipment, getUserShipments, getShipmentById };
