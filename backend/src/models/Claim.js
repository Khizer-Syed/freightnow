const mongoose = require('mongoose');
const { Schema } = mongoose;

const claimSchema = new Schema({
  claimNumber: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  shipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  trackingNumber: { type: String, required: true },
  carrierId: { type: String, required: true },
  carrierName: { type: String, required: true },
  claimType: { type: String, required: true },
  shipmentDate: String,
  amountClaimed: { type: Number, required: true },
  currency: { type: String, default: 'CAD' },
  commodity: String,
  description: { type: String, required: true },
  additionalNotes: String,
  documents: String,
  status: { type: String, default: 'open' },
}, { timestamps: { createdAt: 'submittedAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Claim', claimSchema);
