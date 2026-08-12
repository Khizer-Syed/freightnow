const { auth } = require('express-oauth2-jwt-bearer');
const { auth0Domain, auth0Audience } = require('../config/env');
const User = require('../models/User');
const { AuthenticationError } = require('../utils/errors');

// Auth0 JWT validation middleware
const checkJwt = auth({
  issuerBaseURL: `https://${auth0Domain}`,
  audience: auth0Audience,
});

// After token validation, find or create the user in our database
async function loadUser(req, res, next) {
  try {
    const auth0Id = req.auth.payload.sub;
    const email = req.auth.payload[`https://${auth0Domain}/email`] || req.auth.payload.email || '';

    let user = await User.findOne({ auth0Id });

    if (!user && email) {
      // Check if user exists by email (handles migration from old auth)
      user = await User.findOne({ email });
      if (user) {
        user.auth0Id = auth0Id;
        await user.save();
      }
    }

    if (!user) {
      // First-time login — create a new user record
      const name = req.auth.payload.name || req.auth.payload.nickname || email.split('@')[0] || '';
      const [firstName, ...lastParts] = name.split(' ');
      user = await User.create({
        auth0Id,
        email,
        firstName: firstName || 'User',
        lastName: lastParts.join(' ') || '',
        role: 'customer',
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.company ? user.company.toString() : null,
    };
    next();
  } catch (err) {
    next(new AuthenticationError('Failed to load user profile'));
  }
}

// Combined middleware: validate token + load user
function authenticate(req, res, next) {
  checkJwt(req, res, (err) => {
    if (err) return next(new AuthenticationError(err.message || 'Invalid or expired token'));
    loadUser(req, res, next);
  });
}

// Optional auth — tries to authenticate but doesn't fail if no token
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  authenticate(req, res, (err) => {
    if (err) return next(); // Ignore auth errors for optional routes
    next();
  });
}

module.exports = { authenticate, optionalAuth };
