const Shipment = require('../models/Shipment');
const TrackingEvent = require('../models/TrackingEvent');
const { NotFoundError } = require('../utils/errors');

async function getTracking(trackingNumber) {
  const shipment = await Shipment.findOne({ trackingNumber });
  if (!shipment) throw new NotFoundError('Shipment');

  const trackingEvents = await TrackingEvent.find({ shipment: shipment._id }).sort({ timestamp: -1 });

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
    events: trackingEvents.map(e => ({
      event: e.event,
      location: e.location,
      timestamp: e.timestamp.toISOString(),
      description: e.description,
    })),
  };
}

module.exports = { getTracking };
