const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const claimService = require('../services/claim.service');

const router = Router();

const claimSchema = z.object({
  trackingNumber: z.string().min(1),
  carrierId: z.string().min(1),
  carrierName: z.string().optional(),
  claimType: z.enum(['Damaged goods', 'Lost shipment', 'Shortage', 'Delay', 'Other']),
  shipmentDate: z.string().optional(),
  amountClaimed: z.number().positive(),
  currency: z.enum(['CAD', 'USD']).optional(),
  commodity: z.string().optional(),
  description: z.string().min(1),
  additionalNotes: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

router.post('/', authenticate, validate(claimSchema), async (req, res, next) => {
  try {
    const claim = await claimService.submitClaim(req.user.id, req.validated);
    res.status(201).json({ claim });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await claimService.getUserClaims(req.user.id, { page, limit });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const claim = await claimService.getClaimById(req.params.id, req.user.id);
    res.json(claim);
  } catch (err) { next(err); }
});

// TODO: once a staff-facing "process this claim" endpoint exists (update status/approved
// amount), gate it with requireRole(ROLES.IFF_STAFF, ROLES.IFF_ADMIN). Same for any future
// "view all customers' claims" endpoint.

module.exports = router;
