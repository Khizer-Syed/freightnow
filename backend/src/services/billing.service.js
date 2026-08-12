const PaymentMethod = require('../models/PaymentMethod');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const { NotFoundError } = require('../utils/errors');

async function getPaymentMethods(userId) {
  return PaymentMethod.find({ user: userId }).sort({ createdAt: -1 });
}

async function addPaymentMethod(userId, data) {
  if (data.isDefault) {
    await PaymentMethod.updateMany({ user: userId, isDefault: true }, { isDefault: false });
  }

  return PaymentMethod.create({
    user: userId,
    type: data.type,
    last4: data.last4,
    expiryMonth: data.expiryMonth,
    expiryYear: data.expiryYear,
    isDefault: data.isDefault || false,
  });
}

async function setDefault(paymentMethodId, userId) {
  const method = await PaymentMethod.findOne({ _id: paymentMethodId, user: userId });
  if (!method) throw new NotFoundError('Payment method');

  await PaymentMethod.updateMany({ user: userId, isDefault: true }, { isDefault: false });

  method.isDefault = true;
  await method.save();
  return method;
}

async function deletePaymentMethod(paymentMethodId, userId) {
  const method = await PaymentMethod.findOne({ _id: paymentMethodId, user: userId });
  if (!method) throw new NotFoundError('Payment method');
  await PaymentMethod.deleteOne({ _id: method._id });
}

async function getInvoices(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find({ user: userId }).sort({ issuedAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments({ user: userId }),
  ]);

  return { invoices, pagination: { page, limit, total } };
}

async function getInvoiceById(invoiceId, userId) {
  const invoice = await Invoice.findOne({ _id: invoiceId, user: userId });
  if (!invoice) throw new NotFoundError('Invoice');
  return invoice;
}

async function getBillingStats(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Money lives on Booking (costRate/sellRate), not Shipment — sourced from there.
  const [monthBookings, yearBookings] = await Promise.all([
    Booking.find({ user: userId, bookedAt: { $gte: startOfMonth } }).select('sellRate'),
    Booking.find({ user: userId, bookedAt: { $gte: startOfYear } }).select('sellRate costRate'),
  ]);

  const spentThisMonth = monthBookings.reduce((sum, b) => sum + b.sellRate, 0);
  const spentThisYear = yearBookings.reduce((sum, b) => sum + b.sellRate, 0);
  const totalSaved = yearBookings.reduce((sum, b) => sum + (b.sellRate * 0.15), 0); // Estimated savings vs list rate

  return {
    spentThisMonth: Math.round(spentThisMonth * 100) / 100,
    shipmentsThisMonth: monthBookings.length,
    spentThisYear: Math.round(spentThisYear * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
  };
}

module.exports = { getPaymentMethods, addPaymentMethod, setDefault, deletePaymentMethod, getInvoices, getInvoiceById, getBillingStats };
