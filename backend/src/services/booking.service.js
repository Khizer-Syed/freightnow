const prisma = require('../config/database');
const { generateBookingNumber } = require('../utils/trackingGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const shipmentService = require('./shipment.service');

async function createBooking(userId, { quoteId, quoteRateId, customerReference }) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, userId },
    include: { rates: true, user: true },
  });
  if (!quote) throw new NotFoundError('Quote');
  if (quote.status === 'expired') throw new ValidationError('This quote has expired');
  if (quote.status === 'booked') throw new ValidationError('This quote has already been booked');

  const selectedRate = quote.rates.find(r => r.id === quoteRateId);
  if (!selectedRate) throw new NotFoundError('Rate');

  const bookingNumber = await generateBookingNumber();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        quoteId,
        quoteRateId,
        userId,
        companyId: quote.user.companyId,
        carrierId: selectedRate.carrierId,
        carrierName: selectedRate.carrierName,
        serviceName: selectedRate.serviceName,
        costRate: selectedRate.baseRate,
        sellRate: selectedRate.displayRate,
        currency: quote.currency,
        customerReference,
      },
    });

    await tx.quote.update({ where: { id: quoteId }, data: { status: 'booked' } });

    const shipment = await shipmentService.createShipmentForBooking(tx, booking, quote, selectedRate);

    return { booking, shipment };
  });
}

async function getUserBookings(userId, { status, page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;
  const where = { userId };
  if (status && status !== 'all') where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: { bookedAt: 'desc' }, skip, take: limit }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, pagination: { page, limit, total } };
}

async function getBookingById(bookingId, userId) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { shipment: true },
  });
  if (!booking) throw new NotFoundError('Booking');
  return booking;
}

module.exports = { createBooking, getUserBookings, getBookingById };
