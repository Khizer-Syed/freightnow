const Payment = require('../models/Payment');

// Scaffolding only — no real QuickBooks charge flow exists yet, so this is not called from
// booking.service.js or any route. Ready to be wired up once real credentials exist, same
// pattern as the mocked carrier adapters and FedEx EULA/MFA flow.
async function createPayment(bookingId, userId, data) {
  return Payment.create({
    booking: bookingId,
    user: userId,
    amount: data.amount,
    currency: data.currency || 'CAD',
    qbTransactionId: data.qbTransactionId || null,
    status: data.status || 'pending',
    failureReason: data.failureReason,
  });
}

async function listPaymentsForBooking(bookingId) {
  return Payment.find({ booking: bookingId }).sort({ attemptedAt: -1 });
}

module.exports = { createPayment, listPaymentsForBooking };
