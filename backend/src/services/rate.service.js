const { getAllCarriers, getCarrier } = require('../carriers');
const { applyMarkup } = require('./markup.service');
const prisma = require('../config/database');
const { generateQuoteNumber } = require('../utils/trackingGenerator');
const { endOfDay } = require('../utils/dateHelpers');

async function getAllRates(params, userId) {
  const carriers = getAllCarriers();

  const results = await Promise.allSettled(
    carriers.map(async (carrier) => {
      const rates = await carrier.getRates(params);
      return rates.map(r => ({
        carrierId: carrier.id,
        carrierName: carrier.name,
        ...r,
      }));
    })
  );

  // Collect successful results
  const allRates = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allRates.push(...result.value);
    }
  }

  // Apply markup and sort
  const processedRates = allRates.map(r => ({
    ...r,
    baseRate: r.rate,
    displayRate: applyMarkup(r.rate),
  }));
  processedRates.sort((a, b) => a.displayRate - b.displayRate);

  // Mark best rate
  if (processedRates.length > 0) {
    processedRates[0].isBestRate = true;
  }

  // Save as quote if user is authenticated
  let quoteId = null;
  let quoteNumber = null;
  let expiresAt = null;

  if (userId) {
    quoteNumber = await generateQuoteNumber();
    expiresAt = endOfDay(new Date());

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId,
        shipmentType: params.shipmentType,
        originCity: params.origin.city,
        originPostal: params.origin.postalCode || '',
        originCountry: params.origin.country,
        destCity: params.destination.city,
        destPostal: params.destination.postalCode || '',
        destCountry: params.destination.country,
        weight: params.weight,
        pieces: params.pieces || 1,
        dimL: params.dimensions?.length,
        dimW: params.dimensions?.width,
        dimH: params.dimensions?.height,
        freightClass: params.freightClass,
        currency: params.currency || 'CAD',
        pickupDate: params.pickupDate,
        declaredValue: params.declaredValue,
        commodity: params.commodity,
        accessorials: params.accessorials ? JSON.stringify(params.accessorials) : null,
        expiresAt,
        rates: {
          create: processedRates.map(r => ({
            carrierId: r.carrierId,
            carrierName: r.carrierName,
            serviceName: r.serviceName,
            baseRate: r.baseRate,
            displayRate: r.displayRate,
            transitDays: r.transitDays,
            estimatedDelivery: r.deliveryDate,
            isLiveRate: r.isLive || false,
            isBestRate: r.isBestRate || false,
          })),
        },
      },
    });
    quoteId = quote.id;
  }

  return {
    quoteId,
    quoteNumber,
    expiresAt: expiresAt?.toISOString(),
    rates: processedRates.map(r => ({
      carrierId: r.carrierId,
      carrierName: r.carrierName,
      serviceName: r.serviceName,
      baseRate: r.baseRate,
      displayRate: r.displayRate,
      transitDays: r.transitDays,
      estimatedDelivery: r.deliveryDate,
      isLiveRate: r.isLive || false,
      isBestRate: r.isBestRate || false,
    })),
  };
}

async function getSingleCarrierRate(carrierId, params) {
  const carrier = getCarrier(carrierId);
  if (!carrier) return null;

  const rates = await carrier.getRates(params);
  return rates.map(r => ({
    rate: applyMarkup(r.rate),
    serviceName: r.serviceName,
    transitDays: r.transitDays,
    deliveryDate: r.deliveryDate,
  }));
}

module.exports = { getAllRates, getSingleCarrierRate };
