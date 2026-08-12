const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { AuthenticationError } = require('../utils/errors');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AuthenticationError());
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, email: payload.email, role: payload.role, companyId: payload.companyId };
    next();
  } catch {
    next(new AuthenticationError('Invalid or expired token'));
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, email: payload.email, role: payload.role, companyId: payload.companyId };
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
}

module.exports = { authenticate, optionalAuth };
