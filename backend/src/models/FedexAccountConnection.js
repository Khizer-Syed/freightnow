const mongoose = require('mongoose');
const { Schema } = mongoose;

// Was a JSON-stringified blob in Postgres; a real embedded object here.
const shippingAddressSchema = new Schema({
  street: String,
  city: String,
  province: String,
  postalCode: String,
  country: String,
}, { _id: false });

// FedEx Integrator "End User registration" — connecting a customer's own FedEx account via
// Factor 1 (account number + address) + Factor 2 MFA (PIN or invoice). Mocked: no live FedEx
// Account Registration API call is made yet.
const fedexAccountConnectionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fedexAccountNumber: { type: String, required: true },
  shippingAddress: shippingAddressSchema,
  eulaAcceptedAt: { type: Date, required: true },
  status: { type: String, default: 'awaiting_factor2' }, // awaiting_factor2 | verified | failed | locked
  factor2Method: String, // pin_email | pin_sms | pin_call | invoice
  pinCodeHash: String,
  pinExpiresAt: Date,
  attempts: { type: Number, default: 0 },
  lockedUntil: Date,
  childKey: String,
  childSecret: String,
  verifiedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('FedexAccountConnection', fedexAccountConnectionSchema);
