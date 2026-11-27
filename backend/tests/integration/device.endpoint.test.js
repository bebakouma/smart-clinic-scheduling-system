const request = require('supertest');
const app = require('../../src/app');
const deviceService = require('../../src/services/device.service');

jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

const { prisma } = require('../../src/config/database');

const TOKEN = 'integration-test-device-token';

const scheduled = {
  id: 1,
  status: 'scheduled',
  checked_in: false,
  confirmation_code: 'K7QM4XWD',
  patient: { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }
};

const checkinEvent = { deviceId: 'door-1', type: 'checkin', confirmationCode: 'K7QM4XWD' };
const occupancyEvent = { deviceId: 'door-1', type: 'occupancy', count: 4 };

const post = (body, token = TOKEN) => {
  const req = request(app).post('/api/device/events');
  if (token !== null) req.set('X-Device-Token', token);
  return req.send(body);
};

describe('POST /api/device/events (Task 24)', () => {
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    deviceService._reset();
    process.env.DEVICE_TOKEN = TOKEN;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.DEVICE_TOKEN;
    errorSpy.mockRestore();
  });

  describe('device token', () => {
    it('should reject a request with no token (401) and not touch the database', async () => {
      const res = await post(checkinEvent, null);

      expect(res.status).toBe(401);
      expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should reject a wrong token (401) and not touch the database', async () => {
      const res = await post(checkinEvent, 'wrong-token');

      expect(res.status).toBe(401);
      expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should not record occupancy from a request with a wrong token', async () => {
      await post(occupancyEvent, 'wrong-token');

      expect(deviceService.getOccupancy()).toHaveLength(0);
    });

    it('should reject with 401 (not 400) when the token is wrong AND the body is invalid', async () => {
      const res = await post({ nonsense: true }, 'wrong-token');

      expect(res.status).toBe(401);
    });

    it('should reject every request when DEVICE_TOKEN is not configured', async () => {
      delete process.env.DEVICE_TOKEN;

      const withToken = await post(occupancyEvent, TOKEN);
      const withEmpty = await post(occupancyEvent, '');

      expect(withToken.status).toBe(401);
      expect(withEmpty.status).toBe(401);
    });

    it('should not accept a staff login token in place of the device token', async () => {
      const { generateToken } = require('../../src/middleware/auth');
      const staffJwt = generateToken({ id: 1, role: 'admin', name: 'Admin' });

      const res = await request(app)
        .post('/api/device/events')
        .set('Authorization', `Bearer ${staffJwt}`)
        .send(occupancyEvent);

      expect(res.status).toBe(401);
    });

    it('should not echo the token in the response or the logs', async () => {
      const res = await post(checkinEvent, 'wrong-token-12345');

      const logged = errorSpy.mock.calls.map((a) => a.join(' ')).join('\n');
      expect(JSON.stringify(res.body)).not.toContain('wrong-token-12345');
      expect(JSON.stringify(res.body)).not.toContain(TOKEN);
      expect(logged).not.toContain('wrong-token-12345');
      expect(logged).not.toContain(TOKEN);
    });
  });

  describe('occupancy events', () => {
    it('should accept an occupancy event with the right token', async () => {
      const res = await post(occupancyEvent);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ type: 'occupancy', accepted: true });
      expect(deviceService.getOccupancy()[0]).toMatchObject({ deviceId: 'door-1', count: 4 });
    });

    it.each([-1, 1001, 2.5, 'many'])('should reject an invalid count %p (400)', async (count) => {
      const res = await post({ deviceId: 'door-1', type: 'occupancy', count });

      expect(res.status).toBe(400);
    });

    it('should reject a confirmation code on an occupancy event (400)', async () => {
      const res = await post({ ...occupancyEvent, confirmationCode: 'K7QM4XWD' });

      expect(res.status).toBe(400);
    });
  });

  describe('check-in events', () => {
    it('should check in an appointment and return no patient details', async () => {
      prisma.appointment.findUnique.mockResolvedValue(scheduled);
      prisma.appointment.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...scheduled, ...data })
      );

      const res = await post(checkinEvent);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('checkin');
      expect(res.body.data.appointment_id).toBe(1);
      expect(res.body.data.status).toBe('checked_in');
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('Jane');
      expect(text).not.toContain('jane@example.com');
    });

    it('should look the appointment up by the normalized code', async () => {
      prisma.appointment.findUnique.mockResolvedValue(scheduled);
      prisma.appointment.update.mockResolvedValue({ ...scheduled, status: 'checked_in' });

      await post({ ...checkinEvent, confirmationCode: 'k7qm-4xwd' });

      expect(prisma.appointment.findUnique.mock.calls[0][0].where).toEqual({ confirmation_code: 'K7QM4XWD' });
    });

    it('should return 404 for an unknown code', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      const res = await post(checkinEvent);

      expect(res.status).toBe(404);
    });

    it('should return 409 when the patient is already checked in', async () => {
      prisma.appointment.findUnique.mockResolvedValue({ ...scheduled, checked_in: true });

      const res = await post(checkinEvent);

      expect(res.status).toBe(409);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should return 409 for a cancelled appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue({ ...scheduled, status: 'cancelled' });

      const res = await post(checkinEvent);

      expect(res.status).toBe(409);
    });

    it('should reject a check-in event without a code (400)', async () => {
      const res = await post({ deviceId: 'door-1', type: 'checkin' });

      expect(res.status).toBe(400);
    });
  });

  describe('event validation', () => {
    it('should reject an unknown event type (400)', async () => {
      const res = await post({ deviceId: 'door-1', type: 'reboot' });

      expect(res.status).toBe(400);
    });

    it('should reject a missing device id (400)', async () => {
      const res = await post({ type: 'occupancy', count: 1 });

      expect(res.status).toBe(400);
    });

    it.each(['', 'has space', 'semi;colon', '<script>', 'x'.repeat(65)])(
      'should reject the device id %p (400)',
      async (deviceId) => {
        const res = await post({ deviceId, type: 'occupancy', count: 1 });

        expect(res.status).toBe(400);
      }
    );

    it('should reject unknown extra fields (400)', async () => {
      const res = await post({ ...occupancyEvent, admin: true });

      expect(res.status).toBe(400);
    });
  });
});
