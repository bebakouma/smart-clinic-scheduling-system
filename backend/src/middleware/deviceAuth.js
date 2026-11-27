const crypto = require('crypto');

/**
 * TEMPORARY placeholder device authentication (Task 24).
 *
 * Every request from an IoT device must carry the shared token in the
 * X-Device-Token header. The token comes from the DEVICE_TOKEN environment
 * variable; it is never hardcoded, committed, or logged.
 *
 * This is deliberately basic so the simulated device is not left unprotected
 * while the IoT flow is built. Task 26 replaces it with a unique token for each
 * device and TLS. Known limits of this placeholder:
 *   - one shared token for every device, so a device id is only a label,
 *     not a verified identity;
 *   - no revocation of a single device;
 *   - the token travels in plain text unless TLS is used (Task 26).
 *
 * The check runs BEFORE validation or any database work, and it fails closed:
 * if DEVICE_TOKEN is not configured, every device request is rejected.
 */

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

// Constant-time comparison. Hashing first gives both sides the same length, so
// timingSafeEqual never throws and the comparison time does not reveal how
// much of the token matched.
function tokensMatch(provided, expected) {
  return crypto.timingSafeEqual(sha256(provided), sha256(expected));
}

function unauthorized(res) {
  return res.status(401).json({
    error: {
      message: 'Device authentication required',
      details: null
    }
  });
}

function deviceAuth(req, res, next) {
  const expected = process.env.DEVICE_TOKEN;

  if (!expected) {
    // Server-side only: tell the operator why every device is rejected.
    // The response stays the same as for a wrong token.
    console.error('[device] DEVICE_TOKEN is not set; rejecting device requests');
    return unauthorized(res);
  }

  const provided = req.get('X-Device-Token');
  if (!provided || !tokensMatch(provided, expected)) {
    return unauthorized(res);
  }

  return next();
}

module.exports = { deviceAuth, tokensMatch };
