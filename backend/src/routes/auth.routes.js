const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

const router = Router();

// GET /api/auth/me — return the authenticated user's profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('company').select('-passwordHash');
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
