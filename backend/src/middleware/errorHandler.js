function errorHandler(err, req, res, next) {
  // PII-safe logging: log only the route and error message.
  // Never log req.body — it may contain patient PII (name, DOB, phone, email).
  console.error(`Error: ${req.method} ${req.path} - ${err.message}`);

  // Oversized request body (from express.json limit)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: {
        message: 'Request payload too large',
        details: null
      }
    });
  }

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

  if (err.type === 'unauthorized') {
    return res.status(401).json({
      error: {
        message: err.message || 'Unauthorized',
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
