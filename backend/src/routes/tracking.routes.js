const { Router } = require('express');
const trackingService = require('../services/tracking.service');

const router = Router();

router.get('/:trackingNumber', async (req, res, next) => {
  try {
    const result = await trackingService.getTracking(req.params.trackingNumber);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
