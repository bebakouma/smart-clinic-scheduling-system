const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/middleware/auth');

// Control the data layer so we can force specific error paths.
// The factory must create the object itself (jest hoists jest.mock above
// module-level consts), so we read the mock back via require afterwards.
jest.mock('../../src/config/database', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([])
    },
    user: { findUnique: jest.fn() }
  }
}));

const { prisma: mockPrisma } = require('../../src/config/database');
const tokenFor = (role) => generateToken({ id: 1, role, name: 'Test' });

// A fabricated patient record used to prove PII never reaches error output.
const SECRET_PII = {
  id: 42,
  first_name: 'Johnathan',
  last_name: 'Privatedata',
  date_of_birth: '1980-05-05',
  phone: '555-0199',
  email: 'johnathan.private@example.com'
};

describe('Security test suite — PII leak prevention (Task 19)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('error responses', () => {
    it('should return a generic 500 with no internal detail when the data layer throws', async () => {
      // Force an unexpected error carrying PII in its message.
      mockPrisma.patient.findMany.mockRejectedValueOnce(
        new Error(`DB failure for ${SECRET_PII.email} / ${SECRET_PII.phone}`)
      );

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Internal server error');
      expect(res.body.error.details).toBeNull();

      // The response body must not echo any PII from the thrown error.
      const body = JSON.stringify(res.body);
      expect(body).not.toContain(SECRET_PII.email);
      expect(body).not.toContain(SECRET_PII.phone);
      expect(body).not.toContain(SECRET_PII.last_name);
    });

    it('should not expose a stack trace in the error response', async () => {
      mockPrisma.patient.findMany.mockRejectedValueOnce(new Error('boom'));

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      expect(res.status).toBe(500);
      expect(res.body.error).not.toHaveProperty('stack');
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/);
    });
  });

  describe('logs', () => {
    it('should never log the request body on error (no PII in logs)', async () => {
      mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('lookup failed'));

      await request(app)
        .post('/api/auth/login')
        .send({ email: SECRET_PII.email, password: 'super-secret-password' });

      // The PII-safe error handler logs only "method path - message".
      const logged = consoleErrorSpy.mock.calls.map(args => args.join(' ')).join('\n');
      expect(logged).not.toContain(SECRET_PII.email);
      expect(logged).not.toContain('super-secret-password');
    });
  });

  describe('auth responses', () => {
    it('should never include the password hash in the login response', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'staff@clinic.com',
        // bcrypt hash of some password — must never be returned to the client.
        password_hash: '$2a$10$abcdefghijklmnopqrstuvDUMMYHASHVALUE000000000000000',
        role: 'staff',
        name: 'Staff User'
      });

      // Password won't match the dummy hash, so login fails with 401 and never
      // returns the user object — but we still assert no hash is present.
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'staff@clinic.com', password: 'whatever' });

      expect(JSON.stringify(res.body)).not.toContain('password_hash');
      expect(JSON.stringify(res.body)).not.toContain('$2a$10$');
    });
  });
});
