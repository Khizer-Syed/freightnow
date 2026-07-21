const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const quoteService = require('../services/quote.service');

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await quoteService.getUserQuotes(req.user.id, { page, limit });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const quote = await quoteService.getQuoteById(req.params.id, req.user.id);
    res.json(quote);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await quoteService.deleteQuote(req.params.id, req.user.id);
    res.json({ message: 'Quote deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
