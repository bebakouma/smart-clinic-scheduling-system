function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  if (err.isJoi || err.type === 'validation') {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.details || [{ message: err.message }]
      }
    });
  }

  if (err.type === 'not_found') {
    return res.status(404).json({
      error: {
        message: err.message || 'Resource not found',
        details: null
      }
    });
  }

  if (err.type === 'conflict') {
    return res.status(409).json({
      error: {
        message: err.message,
        details: null
      }
    });
  }

  return res.status(500).json({
    error: {
      message: 'Internal server error',
      details: null
    }
  });
}

module.exports = { errorHandler };
