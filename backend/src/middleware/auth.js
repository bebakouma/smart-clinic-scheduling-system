const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Authentication middleware.
 * Verifies JWT token from Authorization header and attaches user to request.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        details: null
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      name: decoded.name
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Token expired',
          details: null
        }
      });
    }
    return res.status(401).json({
      error: {
        message: 'Invalid token',
        details: null
      }
    });
  }
}

/**
 * Role-based authorization middleware.
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER authMiddleware.
 *
 * @param {string[]} allowedRoles - Array of roles that can access this route
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          details: null
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          details: null
        }
      });
    }

    next();
  };
}

/**
 * Generate a JWT token for a user.
 *
 * @param {object} user - User object with id, role, name
 * @returns {string} Signed JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { authMiddleware, requireRole, generateToken, JWT_SECRET };
