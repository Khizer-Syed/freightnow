const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const billingService = require('../services/billing.service');

const router = Router();

const paymentMethodSchema = z.object({
  type: z.enum(['visa', 'mastercard', 'amex']),
  last4: z.string().length(4),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2024),
  isDefault: z.boolean().optional(),
});

// Payment methods
router.get('/payment-methods', authenticate, async (req, res, next) => {
  try {
    const methods = await billingService.getPaymentMethods(req.user.id);
    res.json({ paymentMethods: methods });
  } catch (err) { next(err); }
});

router.post('/payment-methods', authenticate, validate(paymentMethodSchema), async (req, res, next) => {
  try {
    const method = await billingService.addPaymentMethod(req.user.id, req.validated);
    res.status(201).json({ paymentMethod: method });
  } catch (err) { next(err); }
});

router.put('/payment-methods/:id/default', authenticate, async (req, res, next) => {
  try {
    const method = await billingService.setDefault(req.params.id, req.user.id);
    res.json({ paymentMethod: method });
  } catch (err) { next(err); }
});

router.delete('/payment-methods/:id', authenticate, async (req, res, next) => {
  try {
    await billingService.deletePaymentMethod(req.params.id, req.user.id);
    res.json({ message: 'Payment method removed' });
  } catch (err) { next(err); }
});

// Invoices
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await billingService.getInvoices(req.user.id, { page, limit });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/invoices/:id', authenticate, async (req, res, next) => {
  try {
    const invoice = await billingService.getInvoiceById(req.params.id, req.user.id);
    res.json(invoice);
  } catch (err) { next(err); }
});

// Stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await billingService.getBillingStats(req.user.id);
    res.json(stats);
  } catch (err) { next(err); }
});

module.exports = router;
