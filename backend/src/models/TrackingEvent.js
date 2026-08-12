const mongoose = require('mongoose');
const { Schema } = mongoose;

// Kept as its own collection (not embedded in Shipment) — the client's product guide names
// "Tracking events" as one of its 17 collections.
const trackingEventSchema = new Schema({
  shipment: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true },
  event: { type: String, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, required: true },
  description: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

module.exports = mongoose.model('TrackingEvent', trackingEventSchema);
