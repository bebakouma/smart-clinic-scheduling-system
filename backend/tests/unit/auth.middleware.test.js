const jwt = require('jsonwebtoken');
const { authMiddleware, requireRole, generateToken, JWT_SECRET } = require('../../src/middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should return 401 when no Authorization header is present', () => {
      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: 'Authentication required', details: null }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      req.headers.authorization = 'Basic abc123';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with "Invalid token" for a tampered token', () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: 'Invalid token', details: null }
      });
    });

    it('should return 401 with "Token expired" for an expired token', () => {
      const expiredToken = jwt.sign(
        { sub: 1, role: 'admin', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: 'Token expired', details: null }
      });
    });

    it('should attach user to req and call next for a valid token', () => {
      const token = generateToken({ id: 1, role: 'staff', name: 'Jane' });
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 1,
        role: 'staff',
        name: 'Jane'
      });
    });

    it('should extract correct role from token', () => {
      const token = generateToken({ id: 5, role: 'provider', name: 'Dr. Smith' });
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.user.role).toBe('provider');
      expect(req.user.id).toBe(5);
    });
  });

  describe('requireRole', () => {
    it('should return 401 if req.user is not set', () => {
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not in allowed roles', () => {
      req.user = { id: 1, role: 'readonly', name: 'Viewer' };
      const middleware = requireRole(['admin', 'staff']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: 'Insufficient permissions', details: null }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user role is in allowed roles', () => {
      req.user = { id: 1, role: 'staff', name: 'Jane' };
      const middleware = requireRole(['admin', 'staff']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow admin access to any protected route', () => {
      req.user = { id: 1, role: 'admin', name: 'Admin' };
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject provider from staff-only endpoints', () => {
      req.user = { id: 3, role: 'provider', name: 'Dr. Smith' };
      const middleware = requireRole(['admin', 'staff']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT with correct claims', () => {
      const token = generateToken({ id: 42, role: 'admin', name: 'Boss' });
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.sub).toBe(42);
      expect(decoded.role).toBe('admin');
      expect(decoded.name).toBe('Boss');
      expect(decoded.exp).toBeDefined();
    });

    it('should set expiration to 8 hours', () => {
      const token = generateToken({ id: 1, role: 'staff', name: 'Test' });
      const decoded = jwt.verify(token, JWT_SECRET);

      const eightHoursInSeconds = 8 * 60 * 60;
      const diff = decoded.exp - decoded.iat;

      expect(diff).toBe(eightHoursInSeconds);
    });
  });
});
