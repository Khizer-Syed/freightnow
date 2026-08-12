const mongoose = require('mongoose');
const { Schema } = mongoose;

// The pricing tiers, stored as settings you can change rather than as code. When a tier
// changes, the old row is retired (isActive: false, effectiveTo set) rather than overwritten,
// so a historical quote's markup can still be explained.
const markupRuleSchema = new Schema({
  minAmount: { type: Number, required: true },
  maxAmount: { type: Number, default: null }, // null = unbounded (the ">$2500" tier)
  markupMultiplier: { type: Number, required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('MarkupRule', markupRuleSchema);
