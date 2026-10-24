const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { generateToken, JWT_SECRET } = require('../../src/middleware/auth');

// No DB needed — these tests exercise the JWT verification layer only.
jest.mock('../../src/config/database', () => ({
  prisma: {
    patient: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) }
  }
}));

describe('Security test suite — JWT handling (Task 19)', () => {
  const validUser = { id: 1, role: 'staff', name: 'Test' };

  describe('expired token', () => {
    it('should reject a token whose exp is in the past with 401 "Token expired"', async () => {
      // Sign with a negative expiry so the token is already expired on arrival.
      const expired = jwt.sign(
        { sub: validUser.id, role: validUser.role, name: validUser.name },
        JWT_SECRET,
        { expiresIn: -10 }
      );

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Token expired');
    });
  });

  describe('tampered signature', () => {
    it('should reject a validly structured token signed with the wrong secret (401)', async () => {
      // Forge a token with a different secret — signature verification must fail.
      const forged = jwt.sign(
        { sub: 1, role: 'admin', name: 'Attacker' },
        'wrong-secret-not-the-real-one',
        { expiresIn: '8h' }
      );

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${forged}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid token');
    });

    it('should reject a token with a mutated payload segment (401)', async () => {
      // Take a valid token and flip characters in the payload segment.
      const token = generateToken(validUser);
      const [header, payload, signature] = token.split('.');
      const mutatedPayload = payload.slice(0, -2) + (payload.slice(-2) === 'AA' ? 'BB' : 'AA');
      const tampered = `${header}.${mutatedPayload}.${signature}`;

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });
  });

  describe('malformed authorization header', () => {
    it('should reject a non-Bearer Authorization header with 401', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication required');
    });

    it('should reject a Bearer scheme with no token (401)', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });
  });
});
