const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Quote = require('../models/Quote');
const QuoteRate = require('../models/QuoteRate');
const { generateBookingNumber } = require('../utils/trackingGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const shipmentService = require('./shipment.service');
const activityLogService = require('./activityLog.service');

async function createBooking(userId, { quoteId, quoteRateId, customerReference }) {
  const quote = await Quote.findOne({ _id: quoteId, user: userId }).populate('user');
  if (!quote) throw new NotFoundError('Quote');
  if (quote.status === 'expired') throw new ValidationError('This quote has expired');
  if (quote.status === 'booked') throw new ValidationError('This quote has already been booked');

  const selectedRate = await QuoteRate.findOne({ _id: quoteRateId, quote: quote._id });
  if (!selectedRate) throw new NotFoundError('Rate');

  const bookingNumber = await generateBookingNumber();

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const [booking] = await Booking.create([{
        bookingNumber,
        quote: quote._id,
        quoteRate: selectedRate._id,
        user: userId,
        company: quote.user.company,
        carrierId: selectedRate.carrierId,
        carrierName: selectedRate.carrierName,
        serviceName: selectedRate.serviceName,
        costRate: selectedRate.baseRate,
        sellRate: selectedRate.displayRate,
        currency: quote.currency,
        customerReference,
      }], { session });

      await Quote.updateOne({ _id: quote._id }, { status: 'booked' }, { session });

      const shipment = await shipmentService.createShipmentForBooking(session, booking, quote, selectedRate);

      result = { booking, shipment };
    });
    activityLogService.logActivity(userId, quote.user.company, 'booking_created', {
      bookingId: result.booking.id,
      bookingNumber: result.booking.bookingNumber,
    });
    return result;
  } finally {
    session.endSession();
  }
}

async function getUserBookings(userId, { status, page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;
  const where = { user: userId };
  if (status && status !== 'all') where.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(where).sort({ bookedAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(where),
  ]);

  return { bookings, pagination: { page, limit, total } };
}

async function getBookingById(bookingId, userId) {
  const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('shipment');
  if (!booking) throw new NotFoundError('Booking');
  return booking;
}

module.exports = { createBooking, getUserBookings, getBookingById };
