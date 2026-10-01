const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { ROLES } = require('../constants/roles');
const { publishSchema } = require('./pricingRules.routes');
const pricingAdminService = require('../services/pricingAdmin.service');

// IFF admin only — these expose carrier cost and margin, which customers must never see.
const router = Router();
router.use(authenticate, requireRole(ROLES.IFF_ADMIN));

const intParam = (v, def, min, max) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

router.get('/summary', async (req, res, next) => {
  try {
    res.json(await pricingAdminService.summary({ months: intParam(req.query.months, 12, 1, 60) }));
  } catch (err) { next(err); }
});

router.get('/quotes', async (req, res, next) => {
  try {
    const { from, to, carrierId, search } = req.query;
    res.json(await pricingAdminService.listQuotesForAdmin({
      from: from || undefined,
      to: to || undefined,
      carrierId: carrierId || undefined,
      search: search || undefined,
      adjustedOnly: req.query.adjustedOnly === 'true',
      page: intParam(req.query.page, 1, 1, 10000),
      limit: intParam(req.query.limit, 25, 1, 100),
    }));
  } catch (err) { next(err); }
});

const adjustSchema = z.object({
  newRate: z.number().positive().optional(),
  discountPct: z.number().min(0).max(100).optional(),
  reason: z.enum(['discount', 'competitive', 'contract', 'oneoff', 'correction', 'other']).optional(),
  note: z.string().max(500).optional(),
  revert: z.boolean().optional(),
});

router.patch('/quote-rates/:id', validate(adjustSchema), async (req, res, next) => {
  try {
    const result = await pricingAdminService.adjustQuoteRate(req.user.id, req.params.id, req.validated);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/calibration', async (req, res, next) => {
  try {
    res.json(await pricingAdminService.calibrationReport({
      months: intParam(req.query.months, 12, 1, 60),
      minN: intParam(req.query.minN, 30, 1, 10000),
      cap: intParam(req.query.cap, 10, 1, 100),
    }));
  } catch (err) { next(err); }
});

const previewSchema = z.object({
  ruleSet: publishSchema.omit({ note: true }),
  shipment: z.object({
    cost: z.number().positive(),
    currency: z.enum(['CAD', 'USD']).default('CAD'),
    scope: z.enum(['dom', 'xb', 'intl']),
    mode: z.enum(['courier', 'ltl', 'lcl']),
    packaging: z.enum(['Envelope', 'Package', 'Skid', 'LCL']),
    lines: z.array(z.object({
      qty: z.number().int().positive(),
      l: z.number().nonnegative(),
      w: z.number().nonnegative(),
      h: z.number().nonnegative(),
      wt: z.number().nonnegative(),
    })).min(1),
  }),
});

router.post('/preview', validate(previewSchema), (req, res, next) => {
  try {
    res.json({ result: pricingAdminService.preview(req.validated.ruleSet, req.validated.shipment) });
  } catch (err) { next(err); }
});

module.exports = router;
