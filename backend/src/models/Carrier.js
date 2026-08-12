const mongoose = require('mongoose');
const { Schema } = mongoose;

// Controls how the system treats each carrier — having this as data rather than buried in
// code means a carrier can be switched off in seconds without a code deploy. The actual
// mocked rate/tracking/booking logic stays in backend/src/carriers/*.adapter.js; this
// collection only layers metadata/enabled-state on top of that unchanged adapter code.
const carrierSchema = new Schema({
  carrierId: { type: String, required: true, unique: true }, // matches the adapter key, e.g. 'fedex'
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  providesLiveRates: { type: Boolean, default: false },
  shipmentTypes: [String],
  credentialsRef: String, // e.g. 'env:FEDEX_API_KEY' — never the credential itself
}, { timestamps: true });

module.exports = mongoose.model('Carrier', carrierSchema);
