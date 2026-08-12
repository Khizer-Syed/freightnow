const mongoose = require('mongoose');
const { Schema } = mongoose;

const companySchema = new Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  province: String,
  city: String,
  postalCode: String,
  shippingType: String,
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
