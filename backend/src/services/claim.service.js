const prisma = require('../config/database');
const { generateClaimNumber } = require('../utils/trackingGenerator');
const { NotFoundError } = require('../utils/errors');

async function submitClaim(userId, data) {
  const claimNumber = await generateClaimNumber();

  // Try to find matching shipment
  let shipmentId = null;
  if (data.trackingNumber) {
    const shipment = await prisma.shipment.findUnique({ where: { trackingNumber: data.trackingNumber } });
    if (shipment) shipmentId = shipment.id;
  }

  const claim = await prisma.claim.create({
    data: {
      claimNumber,
      userId,
      shipmentId,
      trackingNumber: data.trackingNumber,
      carrierId: data.carrierId,
      carrierName: data.carrierName || data.carrierId,
      claimType: data.claimType,
      shipmentDate: data.shipmentDate,
      amountClaimed: data.amountClaimed,
      currency: data.currency || 'CAD',
      commodity: data.commodity,
      description: data.description,
      additionalNotes: data.additionalNotes,
      documents: data.documents ? JSON.stringify(data.documents) : null,
    },
  });

  return claim;
}

async function getUserClaims(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.claim.count({ where: { userId } }),
  ]);

  return { claims, pagination: { page, limit, total } };
}

async function getClaimById(claimId, userId) {
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, userId },
  });
  if (!claim) throw new NotFoundError('Claim');
  return claim;
}

module.exports = { submitClaim, getUserClaims, getClaimById };
