const mongoose = require('mongoose');
const { Schema } = mongoose;

const shipmentSchema = new Schema({
  trackingNumber: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: Schema.Types.ObjectId, ref: 'Company' }, // denormalized snapshot
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  carrierId: { type: String, required: true },
  carrierName: { type: String, required: true },
  serviceName: { type: String, required: true },
  shipmentType: { type: String, required: true },
  originCity: String,
  originPostal: { type: String, required: true },
  originCountry: { type: String, required: true },
  destCity: String,
  destPostal: { type: String, required: true },
  destCountry: { type: String, required: true },
  weight: { type: Number, required: true },
  pieces: { type: Number, required: true },
  dimL: Number,
  dimW: Number,
  dimH: Number,
  freightClass: String,
  currency: { type: String, default: 'CAD' },
  declaredValue: Number,
  commodity: String,
  accessorials: String,
  status: { type: String, default: 'pending' },
  estimatedDelivery: String,
  actualDelivery: String,
}, { timestamps: { createdAt: 'bookedAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Shipment', shipmentSchema);
