function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details
        }
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { validate };
