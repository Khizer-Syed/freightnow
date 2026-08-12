const mongoose = require('mongoose');
const { Schema } = mongoose;

// A running record of significant events — who logged in, who accepted terms, who booked
// what, who changed a markup rule. Written via services/activityLog.service.js.
const activityLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  company: { type: Schema.Types.ObjectId, ref: 'Company' },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
