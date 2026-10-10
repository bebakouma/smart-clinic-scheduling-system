const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/middleware/auth');

// Mock all services/repositories touched so no DB is required — these tests
// focus on the auth + RBAC middleware layer, not business logic.
jest.mock('../../src/config/database', () => ({
  prisma: {
    patient: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    appointment: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    waitlistEntry: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) }
  }
}));

const tokenFor = (role) => generateToken({ id: 1, role, name: 'Test' });

describe('Auth + RBAC route protection (Task 17)', () => {
  describe('unauthenticated access', () => {
    it('should reject GET /api/patients with 401 when no token is provided', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Authentication required');
    });

    it('should reject GET /api/dashboard/summary with 401 when no token is provided', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(401);
    });

    it('should reject with 401 for a tampered token', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });
  });

  describe('authorized access', () => {
    it('should allow staff to GET /api/patients', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('staff')}`);
      expect(res.status).toBe(200);
    });

    it('should allow any authenticated role to GET /api/dashboard/summary', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${tokenFor('readonly')}`);
      expect(res.status).toBe(200);
    });
  });

  describe('role-restricted access', () => {
    it('should forbid readonly role from creating an appointment (403)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${tokenFor('readonly')}`)
        .send({ patient_id: 1, provider_name: 'Dr. A', appointment_type: 'checkup', appointment_datetime: '2030-01-01T10:00:00Z' });
      expect(res.status).toBe(403);
    });

    it('should forbid staff from deleting a patient (admin only) (403)', async () => {
      const res = await request(app)
        .delete('/api/patients/1')
        .set('Authorization', `Bearer ${tokenFor('staff')}`);
      expect(res.status).toBe(403);
    });

    it('should forbid provider from creating a patient (403)', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${tokenFor('provider')}`)
        .send({ first_name: 'A', last_name: 'B', date_of_birth: '1990-01-01' });
      expect(res.status).toBe(403);
    });
  });
});
