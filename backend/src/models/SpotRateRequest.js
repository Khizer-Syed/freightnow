const mongoose = require('mongoose');
const { Schema } = mongoose;

const spotRateRequestSchema = new Schema({
  requestNumber: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  shipmentType: { type: String, required: true },
  originCity: String,
  originPostal: String,
  originCountry: { type: String, required: true },
  destCity: String,
  destPostal: String,
  destCountry: { type: String, required: true },
  originPort: String,
  destPort: String,
  oceanType: String,
  weight: Number,
  pieces: Number,
  dimensions: String,
  pickupDate: String,
  commodity: String,
  declaredValue: Number,
  specialNotes: String,
  status: { type: String, default: 'pending' },
  quotedRate: Number,
  quotedAt: Date,
}, { timestamps: { createdAt: 'submittedAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('SpotRateRequest', spotRateRequestSchema);
