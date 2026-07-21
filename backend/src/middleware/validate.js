const { ValidationError } = require('../utils/errors');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new ValidationError('Invalid request data', details));
    }
    req.validated = result.data;
    next();
  };
}

module.exports = validate;
