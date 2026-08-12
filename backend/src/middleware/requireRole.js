const { AuthorizationError } = require('../utils/errors');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError());
    }
    next();
  };
}

module.exports = requireRole;
