const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const spotRateService = require('../services/spotRate.service');

const router = Router();

const spotRateSchema = z.object({
  shipmentType: z.enum(['ftl', 'air', 'ocean']),
  origin: z.object({
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().min(2),
  }),
  destination: z.object({
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().min(2),
  }),
  originPort: z.string().optional(),
  destPort: z.string().optional(),
  oceanType: z.string().optional(),
  weight: z.number().positive().optional(),
  pieces: z.number().int().positive().optional(),
  dimensions: z.string().optional(),
  pickupDate: z.string().optional(),
  commodity: z.string().optional(),
  declaredValue: z.number().optional(),
  specialNotes: z.string().optional(),
});

router.post('/', authenticate, validate(spotRateSchema), async (req, res, next) => {
  try {
    const spotRate = await spotRateService.submitSpotRate(req.user.id, req.validated);
    res.status(201).json({
      spotRate,
      message: 'Your request has been submitted. Our team will respond within 2-4 business hours.',
    });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await spotRateService.getUserSpotRates(req.user.id, { page, limit });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const spotRate = await spotRateService.getSpotRateById(req.params.id, req.user.id);
    res.json(spotRate);
  } catch (err) { next(err); }
});

module.exports = router;
