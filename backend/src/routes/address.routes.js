const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const addressService = require('../services/address.service');
const { NotFoundError } = require('../utils/errors');

const router = Router();

const addressSchema = z.object({
  contactName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  province: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(2),
  isResidential: z.boolean().optional(),
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!req.user.companyId) return res.json({ addresses: [] });
    const addresses = await addressService.listAddresses(req.user.companyId);
    res.json({ addresses });
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(addressSchema), async (req, res, next) => {
  try {
    if (!req.user.companyId) throw new NotFoundError('Company');
    const address = await addressService.createAddress(req.user.companyId, req.user.id, req.validated);
    res.status(201).json({ address });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, validate(addressSchema.partial()), async (req, res, next) => {
  try {
    if (!req.user.companyId) throw new NotFoundError('Company');
    const address = await addressService.updateAddress(req.user.companyId, req.params.id, req.validated);
    res.json({ address });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!req.user.companyId) throw new NotFoundError('Company');
    await addressService.deleteAddress(req.user.companyId, req.params.id);
    res.json({ message: 'Address deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
