const request = require('supertest');
const app = require('../../src/app');

jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

const { prisma } = require('../../src/config/database');

const appointment = {
  id: 1,
  status: 'scheduled',
  checked_in: false,
  confirmation_code: 'K7QM4XWD',
  appointment_datetime: new Date('2030-01-01T15:00:00Z'),
  patient: {
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '555-0100',
    email: 'jane@example.com',
    date_of_birth: new Date('1985-03-09T00:00:00Z')
  }
};

const valid = { confirmationCode: 'K7QM4XWD', dateOfBirth: '1985-03-09' };

describe('Kiosk endpoints (Task 23)', () => {
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  describe('POST /api/kiosk/lookup', () => {
    it('should work without a staff login and return only first name and time', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);

      const res = await request(app).post('/api/kiosk/lookup').send(valid);

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data).sort()).toEqual(['appointment_datetime', 'first_name']);
      expect(res.body.data.first_name).toBe('Jane');
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('Doe');
      expect(text).not.toContain('555-0100');
      expect(text).not.toContain('jane@example.com');
    });

    it('should not change the appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);

      await request(app).post('/api/kiosk/lookup').send(valid);

      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should return the same 404 for a wrong date of birth and an unknown code', async () => {
      prisma.appointment.findUnique.mockResolvedValueOnce(appointment);
      const wrongDob = await request(app)
        .post('/api/kiosk/lookup')
        .send({ ...valid, dateOfBirth: '1990-01-01' });

      prisma.appointment.findUnique.mockResolvedValueOnce(null);
      const unknownCode = await request(app).post('/api/kiosk/lookup').send(valid);

      expect(wrongDob.status).toBe(404);
      expect(unknownCode.status).toBe(404);
      expect(wrongDob.body).toEqual(unknownCode.body);
    });

    it('should reject a malformed date of birth with 400', async () => {
      const res = await request(app)
        .post('/api/kiosk/lookup')
        .send({ confirmationCode: 'K7QM4XWD', dateOfBirth: 'March 9th' });

      expect(res.status).toBe(400);
    });

    it('should reject a missing code with 400', async () => {
      const res = await request(app).post('/api/kiosk/lookup').send({ dateOfBirth: '1985-03-09' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for an appointment that is already checked in', async () => {
      prisma.appointment.findUnique.mockResolvedValue({ ...appointment, checked_in: true });

      const res = await request(app).post('/api/kiosk/lookup').send(valid);

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/kiosk/checkin', () => {
    it('should check the patient in without a staff login', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);
      prisma.appointment.update.mockResolvedValue({ ...appointment, checked_in: true });

      const res = await request(app).post('/api/kiosk/checkin').send(valid);

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Jane');
      const updateArg = prisma.appointment.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 1 });
      expect(updateArg.data.checked_in).toBe(true);
      expect(updateArg.data.status).toBe('checked_in');
    });

    it('should not check in when the date of birth is wrong', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);

      const res = await request(app)
        .post('/api/kiosk/checkin')
        .send({ ...valid, dateOfBirth: '1999-12-31' });

      expect(res.status).toBe(404);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should not log the date of birth or confirmation code on failure', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await request(app).post('/api/kiosk/checkin').send(valid);

      const logged = errorSpy.mock.calls.map(args => args.join(' ')).join('\n');
      expect(logged).not.toContain('1985-03-09');
      expect(logged).not.toContain('K7QM4XWD');
    });
  });

  describe('staff check-in is still protected', () => {
    it('should still require a staff login for POST /api/checkin', async () => {
      const res = await request(app).post('/api/checkin').send({ appointmentId: 1 });

      expect(res.status).toBe(401);
    });
  });
});
