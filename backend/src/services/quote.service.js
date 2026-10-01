const Quote = require('../models/Quote');
const QuoteRate = require('../models/QuoteRate');
const { NotFoundError } = require('../utils/errors');

// Carrier cost and markup are IFF-internal (the product guide: cost is never shown to the
// customer). Customer-facing quote reads only get the price they'd pay.
const CUSTOMER_RATE_FIELDS = '-baseRate -engineRate -markupPct -grossMargin -costCad -sellCad -fxRate -rulesVersion -adjustedBy -adjustedAt -adjustmentReason -adjustmentNote';

async function getUserQuotes(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  // Mark expired quotes
  await Quote.updateMany(
    { user: userId, status: 'active', expiresAt: { $lt: new Date() } },
    { status: 'expired' }
  );

  const [quotes, total] = await Promise.all([
    Quote.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Quote.countDocuments({ user: userId }),
  ]);

  const withRates = await Promise.all(quotes.map(async (quote) => {
    const rates = await QuoteRate.find({ quote: quote._id }).select(CUSTOMER_RATE_FIELDS).sort({ displayRate: 1 });
    const obj = quote.toObject({ virtuals: true });
    obj.rates = rates;
    return obj;
  }));

  return { quotes: withRates, pagination: { page, limit, total } };
}

async function getQuoteById(quoteId, userId) {
  const quote = await Quote.findOne({ _id: quoteId, user: userId });
  if (!quote) throw new NotFoundError('Quote');

  // Update expiry status
  if (quote.status === 'active' && new Date() > quote.expiresAt) {
    quote.status = 'expired';
    await quote.save();
  }

  const rates = await QuoteRate.find({ quote: quote._id }).select(CUSTOMER_RATE_FIELDS).sort({ displayRate: 1 });
  const obj = quote.toObject({ virtuals: true });
  obj.rates = rates;
  return obj;
}

async function deleteQuote(quoteId, userId) {
  const quote = await Quote.findOne({ _id: quoteId, user: userId });
  if (!quote) throw new NotFoundError('Quote');

  await QuoteRate.deleteMany({ quote: quote._id });
  await Quote.deleteOne({ _id: quote._id });
}

module.exports = { getUserQuotes, getQuoteById, deleteQuote };
