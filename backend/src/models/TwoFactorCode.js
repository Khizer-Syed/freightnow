const mongoose = require('mongoose');
const { Schema } = mongoose;

// Second factor for login — a short-lived, bcrypt-hashed 6-digit code emailed (mocked via
// console.log in dev) after a correct password.
const twoFactorCodeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  consumedAt: Date,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

module.exports = mongoose.model('TwoFactorCode', twoFactorCodeSchema);
