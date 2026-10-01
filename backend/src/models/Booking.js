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

  // IFF price overrides made after booking. sellRate always holds the current agreed price;
  // originalSellRate keeps what the customer booked at. balanceAdjustment is what's still owed
  // either way once a paid booking is repriced: negative = credit owed to the customer,
  // positive = extra to collect. Settling it (refund / extra charge) is a manual step for now —
  // there's no automatic QuickBooks refund.
  originalSellRate: Number,
  balanceAdjustment: { type: Number, default: 0 },
  priceAdjustments: [{
    from: Number,
    to: Number,
    reason: String,
    note: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: Date,
  }],
}, { timestamps: { createdAt: 'bookedAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Booking', bookingSchema);
