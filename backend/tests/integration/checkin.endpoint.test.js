const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/middleware/auth');

// Control the data layer so the endpoint can run without a real DB.
jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

const { prisma } = require('../../src/config/database');
const tokenFor = (role) => generateToken({ id: 1, role, name: 'Test' });

const scheduled = {
  id: 1,
  patient_id: 1,
  status: 'scheduled',
  checked_in: false,
  checked_in_at: null,
  confirmation_code: 'ABC123'
};

describe('POST /api/checkin (Task 22)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/checkin').send({ appointmentId: 1 });
    expect(res.status).toBe(401);
  });

  it('should forbid a readonly role from checking in (403)', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${tokenFor('readonly')}`)
      .send({ appointmentId: 1 });
    expect(res.status).toBe(403);
  });

  it('should reject a body with neither appointmentId nor confirmationCode (400)', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should check in a valid appointment for staff (200) and return checked_in', async () => {
    prisma.appointment.findUnique.mockResolvedValue(scheduled);
    prisma.appointment.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...scheduled, ...data })
    );

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({ appointmentId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.checked_in).toBe(true);
    expect(res.body.data.status).toBe('checked_in');
  });

  it('should return 409 when the appointment is already checked in', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ ...scheduled, checked_in: true });

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({ appointmentId: 1 });

    expect(res.status).toBe(409);
  });

  it('should return 404 when the appointment does not exist', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${tokenFor('staff')}`)
      .send({ appointmentId: 999 });

    expect(res.status).toBe(404);
  });
});
