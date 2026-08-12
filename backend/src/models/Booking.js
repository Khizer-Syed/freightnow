const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema({
  bookingNumber: { type: String, required: true, unique: true },
  quote: { type: Schema.Types.ObjectId, ref: 'Quote', required: true, unique: true },
  quoteRate: { type: Schema.Types.ObjectId, ref: 'QuoteRate', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: Schema.Types.ObjectId, ref: 'Company' }, // snapshot at booking time
  carrierId: { type: String, required: true },
  carrierName: { type: String, required: true },
  serviceName: { type: String, required: true },
  costRate: { type: Number, required: true },
  sellRate: { type: Number, required: true },
  currency: { type: String, default: 'CAD' },
  customerReference: String,
  paymentStatus: { type: String, default: 'not_required' },
  status: { type: String, default: 'confirmed' },
  pickupConfirmationNumber: String,
  pickupConfirmedAt: Date,
  cancelledAt: Date,
}, { timestamps: { createdAt: 'bookedAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Booking', bookingSchema);
