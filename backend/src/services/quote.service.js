const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getUserQuotes(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  // Mark expired quotes
  await prisma.quote.updateMany({
    where: { userId, status: 'active', expiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  });

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where: { userId },
      include: { rates: { orderBy: { displayRate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.quote.count({ where: { userId } }),
  ]);

  return { quotes, pagination: { page, limit, total } };
}

async function getQuoteById(quoteId, userId) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, userId },
    include: { rates: { orderBy: { displayRate: 'asc' } } },
  });
  if (!quote) throw new NotFoundError('Quote');

  // Update expiry status
  if (quote.status === 'active' && new Date() > quote.expiresAt) {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'expired' } });
    quote.status = 'expired';
  }

  return quote;
}

async function deleteQuote(quoteId, userId) {
  const quote = await prisma.quote.findFirst({ where: { id: quoteId, userId } });
  if (!quote) throw new NotFoundError('Quote');

  await prisma.quoteRate.deleteMany({ where: { quoteId } });
  await prisma.quote.delete({ where: { id: quoteId } });
}

module.exports = { getUserQuotes, getQuoteById, deleteQuote };
