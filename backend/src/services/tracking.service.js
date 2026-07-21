const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getTracking(trackingNumber) {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingNumber },
    include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
  });
  if (!shipment) throw new NotFoundError('Shipment');

  const route = [shipment.originCity, shipment.destCity].filter(Boolean).join(' → ') ||
    `${shipment.originPostal} → ${shipment.destPostal}`;

  return {
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrierName,
    route,
    status: shipment.status,
    estimatedDelivery: shipment.estimatedDelivery,
    service: shipment.serviceName,
    weight: `${shipment.weight} lbs`,
    pieces: `${shipment.pieces}`,
    events: shipment.trackingEvents.map(e => ({
      event: e.event,
      location: e.location,
      timestamp: e.timestamp.toISOString(),
      description: e.description,
    })),
  };
}

module.exports = { getTracking };
