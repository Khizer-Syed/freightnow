const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getPaymentMethods(userId) {
  return prisma.paymentMethod.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function addPaymentMethod(userId, data) {
  // If setting as default, unset existing defaults
  if (data.isDefault) {
    await prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.paymentMethod.create({
    data: {
      userId,
      type: data.type,
      last4: data.last4,
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      isDefault: data.isDefault || false,
    },
  });
}

async function setDefault(paymentMethodId, userId) {
  const method = await prisma.paymentMethod.findFirst({ where: { id: paymentMethodId, userId } });
  if (!method) throw new NotFoundError('Payment method');

  await prisma.paymentMethod.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });

  return prisma.paymentMethod.update({
    where: { id: paymentMethodId },
    data: { isDefault: true },
  });
}

async function deletePaymentMethod(paymentMethodId, userId) {
  const method = await prisma.paymentMethod.findFirst({ where: { id: paymentMethodId, userId } });
  if (!method) throw new NotFoundError('Payment method');
  await prisma.paymentMethod.delete({ where: { id: paymentMethodId } });
}

async function getInvoices(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where: { userId } }),
  ]);

  return { invoices, pagination: { page, limit, total } };
}

async function getInvoiceById(invoiceId, userId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { items: true },
  });
  if (!invoice) throw new NotFoundError('Invoice');
  return invoice;
}

async function getBillingStats(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [monthShipments, yearShipments] = await Promise.all([
    prisma.shipment.findMany({
      where: { userId, bookedAt: { gte: startOfMonth } },
      select: { booking: { select: { sellRate: true } } },
    }),
    prisma.shipment.findMany({
      where: { userId, bookedAt: { gte: startOfYear } },
      select: { booking: { select: { sellRate: true, costRate: true } } },
    }),
  ]);

  const spentThisMonth = monthShipments.reduce((sum, s) => sum + (s.booking?.sellRate || 0), 0);
  const spentThisYear = yearShipments.reduce((sum, s) => sum + (s.booking?.sellRate || 0), 0);
  const totalSaved = yearShipments.reduce((sum, s) => sum + ((s.booking?.sellRate || 0) * 0.15), 0); // Estimated savings vs list rate

  return {
    spentThisMonth: Math.round(spentThisMonth * 100) / 100,
    shipmentsThisMonth: monthShipments.length,
    spentThisYear: Math.round(spentThisYear * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
  };
}

module.exports = { getPaymentMethods, addPaymentMethod, setDefault, deletePaymentMethod, getInvoices, getInvoiceById, getBillingStats };
