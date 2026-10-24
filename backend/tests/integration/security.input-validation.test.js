const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/middleware/auth');

// Control the data layer. Injection strings must never reach a raw query;
// Prisma is parameterized, so here we assert the request is rejected at the
// validation/routing layer before any DB call matters.
// The factory must build the object itself (jest hoists jest.mock above
// module-level consts); we read the mock back via require afterwards.
jest.mock('../../src/config/database', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(data => Promise.resolve({ id: 1, ...data.data }))
    },
    appointment: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([])
    }
  }
}));

const { prisma: mockPrisma } = require('../../src/config/database');
const tokenFor = (role) => generateToken({ id: 1, role, name: 'Test' });

describe('Security test suite — input validation (Task 19)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('SQL-injection-style input in path params', () => {
    it('should safely reject an injection string in an ID param (not 500)', async () => {
      const res = await request(app)
        .get('/api/appointments/1%3B%20DROP%20TABLE%20patients') // "1; DROP TABLE patients"
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      // parseInt() yields NaN -> service returns not_found. Never a 500 or a
      // leaked DB error. Accept 400/404 as the safe outcomes.
      expect([400, 404]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('should never pass a raw injection string to the data layer as the id', async () => {
      await request(app)
        .get('/api/appointments/1%20OR%201%3D1') // "1 OR 1=1"
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      // parseInt() coerces the param to a number before it ever reaches the
      // repository, so the raw injection string can never reach Prisma. If a
      // query ran, the id must be a number (here parseInt("1 OR 1=1") === 1),
      // never the attacker-controlled string.
      if (mockPrisma.appointment.findUnique.mock.calls.length > 0) {
        const arg = mockPrisma.appointment.findUnique.mock.calls[0][0];
        const idArg = arg && arg.where ? arg.where.id : undefined;
        expect(typeof idArg).toBe('number');
        expect(idArg).not.toBe('1 OR 1=1');
      }
    });
  });

  describe('XSS payload in a body field', () => {
    it('should store the payload as inert data without reflecting executable script', async () => {
      const xss = '<script>alert("xss")</script>';

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({
          first_name: xss,
          last_name: 'Doe',
          date_of_birth: '1990-01-01'
        });

      // The API is JSON-only; the payload is treated as a plain string value,
      // never interpreted. Response is JSON (not text/html) so it cannot execute.
      expect(res.headers['content-type']).toMatch(/application\/json/);
      // Either created (stored verbatim) or rejected by validation — never a crash.
      expect([201, 400]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  describe('invalid and malformed IDs', () => {
    it('should reject a non-numeric ID with a safe 404 (not_found), not 500', async () => {
      const res = await request(app)
        .get('/api/appointments/not-a-number')
        .set('Authorization', `Bearer ${tokenFor('staff')}`);

      expect([400, 404]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });

    it('should reject unknown fields / bad types in a create body with 400', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({
          first_name: '', // violates min(1)
          last_name: 'Doe',
          date_of_birth: 'not-a-date'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Validation failed');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });
  });

  describe('oversized request body', () => {
    it('should reject a body exceeding the configured size limit', async () => {
      const huge = 'x'.repeat(200 * 1024); // > 100kb limit
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .set('Content-Type', 'application/json')
        .send({ first_name: huge, last_name: 'Doe', date_of_birth: '1990-01-01' });

      expect([400, 413]).toContain(res.status);
    });
  });
});
