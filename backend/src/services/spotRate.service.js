const prisma = require('../config/database');
const { generateSpotRateNumber } = require('../utils/trackingGenerator');
const { NotFoundError } = require('../utils/errors');

async function submitSpotRate(userId, data) {
  const requestNumber = await generateSpotRateNumber();

  const spotRate = await prisma.spotRateRequest.create({
    data: {
      requestNumber,
      userId,
      shipmentType: data.shipmentType,
      originCity: data.origin?.city,
      originPostal: data.origin?.postalCode,
      originCountry: data.origin?.country || 'CA',
      destCity: data.destination?.city,
      destPostal: data.destination?.postalCode,
      destCountry: data.destination?.country || 'US',
      originPort: data.originPort,
      destPort: data.destPort,
      oceanType: data.oceanType,
      weight: data.weight,
      pieces: data.pieces,
      dimensions: data.dimensions,
      pickupDate: data.pickupDate,
      commodity: data.commodity,
      declaredValue: data.declaredValue,
      specialNotes: data.specialNotes,
    },
  });

  return spotRate;
}

async function getUserSpotRates(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [spotRates, total] = await Promise.all([
    prisma.spotRateRequest.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.spotRateRequest.count({ where: { userId } }),
  ]);

  return { spotRates, pagination: { page, limit, total } };
}

async function getSpotRateById(spotRateId, userId) {
  const spotRate = await prisma.spotRateRequest.findFirst({
    where: { id: spotRateId, userId },
  });
  if (!spotRate) throw new NotFoundError('Spot rate request');
  return spotRate;
}

module.exports = { submitSpotRate, getUserSpotRates, getSpotRateById };
