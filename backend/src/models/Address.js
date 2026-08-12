const mongoose = require('mongoose');
const { Schema } = mongoose;

// A saved address book, shared across everyone at the same company.
const addressSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  contactName: String,
  companyName: String,
  phone: String,
  street: { type: String, required: true },
  city: { type: String, required: true },
  province: String,
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  isResidential: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema);
