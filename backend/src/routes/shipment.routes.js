const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const shipmentService = require('../services/shipment.service');

const router = Router();

const bookSchema = z.object({
  quoteId: z.string().uuid(),
  rateId: z.string().uuid(),
});

router.post('/', authenticate, validate(bookSchema), async (req, res, next) => {
  try {
    const shipment = await shipmentService.bookShipment(req.user.id, req.validated);
    res.status(201).json({ shipment });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page, limit, search } = req.query;
    const result = await shipmentService.getUserShipments(req.user.id, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const shipment = await shipmentService.getShipmentById(req.params.id, req.user.id);
    res.json(shipment);
  } catch (err) { next(err); }
});

module.exports = router;
