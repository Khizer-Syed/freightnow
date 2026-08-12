const Claim = require('../models/Claim');
const Shipment = require('../models/Shipment');
const { generateClaimNumber } = require('../utils/trackingGenerator');
const { NotFoundError } = require('../utils/errors');

async function submitClaim(userId, data) {
  const claimNumber = await generateClaimNumber();

  // Try to find matching shipment
  let shipmentId = null;
  if (data.trackingNumber) {
    const shipment = await Shipment.findOne({ trackingNumber: data.trackingNumber });
    if (shipment) shipmentId = shipment._id;
  }

  const claim = await Claim.create({
    claimNumber,
    user: userId,
    shipment: shipmentId,
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
  });

  return claim;
}

async function getUserClaims(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [claims, total] = await Promise.all([
    Claim.find({ user: userId }).sort({ submittedAt: -1 }).skip(skip).limit(limit),
    Claim.countDocuments({ user: userId }),
  ]);

  return { claims, pagination: { page, limit, total } };
}

async function getClaimById(claimId, userId) {
  const claim = await Claim.findOne({ _id: claimId, user: userId });
  if (!claim) throw new NotFoundError('Claim');
  return claim;
}

module.exports = { submitClaim, getUserClaims, getClaimById };
