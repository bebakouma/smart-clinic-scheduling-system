const appointmentsService = require('../../src/services/appointments.service');
const appointmentsRepo = require('../../src/repositories/appointments.repository');
const patientsRepo = require('../../src/repositories/patients.repository');
const {
  generateConfirmationCode,
  normalizeConfirmationCode,
  ALPHABET,
  CODE_LENGTH
} = require('../../src/utils/confirmationCode');

jest.mock('../../src/repositories/appointments.repository');
jest.mock('../../src/repositories/patients.repository');

describe('Confirmation codes (Task 23)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should generate an 8 character code from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateConfirmationCode();
      expect(code).toHaveLength(CODE_LENGTH);
      for (const ch of code) expect(ALPHABET).toContain(ch);
    }
  });

  it('should never use look-alike characters (0, O, 1, I)', () => {
    expect(ALPHABET).not.toMatch(/[01OI]/);
  });

  it('should generate different codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateConfirmationCode));
    expect(codes.size).toBe(100);
  });

  it('should normalize typed input (case, spaces, dashes)', () => {
    expect(normalizeConfirmationCode(' k7qm-4xwd ')).toBe('K7QM4XWD');
    expect(normalizeConfirmationCode('K7QM 4XWD')).toBe('K7QM4XWD');
    expect(normalizeConfirmationCode(null)).toBe('');
  });

  it('should attach a unique confirmation code when an appointment is created', async () => {
    patientsRepo.findById.mockResolvedValue({ id: 1 });
    appointmentsRepo.findConflict.mockResolvedValue(null);
    appointmentsRepo.findByConfirmationCode.mockResolvedValue(null);
    appointmentsRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

    await appointmentsService.create({
      patient_id: 1,
      provider_name: 'Dr. Smith',
      appointment_type: 'checkup',
      appointment_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    const created = appointmentsRepo.create.mock.calls[0][0];
    expect(created.confirmation_code).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('should retry when a generated code is already taken', async () => {
    patientsRepo.findById.mockResolvedValue({ id: 1 });
    appointmentsRepo.findConflict.mockResolvedValue(null);
    appointmentsRepo.findByConfirmationCode
      .mockResolvedValueOnce({ id: 99 }) // first code collides
      .mockResolvedValueOnce(null);      // second is free
    appointmentsRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

    await appointmentsService.create({
      patient_id: 1,
      provider_name: 'Dr. Smith',
      appointment_type: 'checkup',
      appointment_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    expect(appointmentsRepo.findByConfirmationCode).toHaveBeenCalledTimes(2);
    expect(appointmentsRepo.create).toHaveBeenCalledTimes(1);
  });
});

describe('Kiosk check-in (Task 23)', () => {
  beforeEach(() => jest.clearAllMocks());

  const appointment = {
    id: 1,
    status: 'scheduled',
    checked_in: false,
    confirmation_code: 'K7QM4XWD',
    appointment_datetime: new Date('2030-01-01T15:00:00Z'),
    provider_name: 'Dr. Smith',
    notes: 'private note',
    patient: {
      id: 1,
      first_name: 'Jane',
      last_name: 'Doe',
      phone: '555-0100',
      email: 'jane@example.com',
      date_of_birth: new Date('1985-03-09T00:00:00Z')
    }
  };

  const GENERIC = 'We could not find a matching appointment. Please see the front desk.';

  describe('identity verification', () => {
    it('should accept the right code and date of birth', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);

      const view = await appointmentsService.kioskLookup({
        confirmationCode: 'K7QM4XWD',
        dateOfBirth: '1985-03-09'
      });

      expect(view.first_name).toBe('Jane');
    });

    it('should accept a code typed in lowercase with a dash', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);

      await appointmentsService.kioskLookup({ confirmationCode: 'k7qm-4xwd', dateOfBirth: '1985-03-09' });

      expect(appointmentsRepo.findByConfirmationCode).toHaveBeenCalledWith('K7QM4XWD');
    });

    it('should reject a wrong date of birth with the generic error', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);

      await expect(
        appointmentsService.kioskLookup({ confirmationCode: 'K7QM4XWD', dateOfBirth: '1990-01-01' })
      ).rejects.toMatchObject({ message: GENERIC, type: 'not_found' });
    });

    it('should reject an unknown code with the SAME generic error', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(null);

      await expect(
        appointmentsService.kioskLookup({ confirmationCode: 'ZZZZZZZZ', dateOfBirth: '1985-03-09' })
      ).rejects.toMatchObject({ message: GENERIC, type: 'not_found' });
    });

    it('should reject missing input with the generic error without querying', async () => {
      await expect(
        appointmentsService.kioskLookup({ confirmationCode: '', dateOfBirth: '1985-03-09' })
      ).rejects.toMatchObject({ message: GENERIC });
      expect(appointmentsRepo.findByConfirmationCode).not.toHaveBeenCalled();
    });
  });

  describe('what the kiosk is allowed to see', () => {
    it('should return only first name and appointment time', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);

      const view = await appointmentsService.kioskLookup({
        confirmationCode: 'K7QM4XWD',
        dateOfBirth: '1985-03-09'
      });

      expect(Object.keys(view).sort()).toEqual(['appointment_datetime', 'first_name']);
      const text = JSON.stringify(view);
      expect(text).not.toContain('Doe');
      expect(text).not.toContain('555-0100');
      expect(text).not.toContain('jane@example.com');
      expect(text).not.toContain('private note');
      expect(text).not.toContain('1985');
    });
  });

  describe('lookup vs check-in', () => {
    it('should not change the appointment on lookup', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);

      await appointmentsService.kioskLookup({ confirmationCode: 'K7QM4XWD', dateOfBirth: '1985-03-09' });

      expect(appointmentsRepo.update).not.toHaveBeenCalled();
    });

    it('should check the patient in on confirmation', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);
      appointmentsRepo.update.mockResolvedValue({ ...appointment, checked_in: true });

      const view = await appointmentsService.kioskCheckIn({
        confirmationCode: 'K7QM4XWD',
        dateOfBirth: '1985-03-09'
      });

      const [id, data] = appointmentsRepo.update.mock.calls[0];
      expect(id).toBe(1);
      expect(data.checked_in).toBe(true);
      expect(data.status).toBe('checked_in');
      expect(view.first_name).toBe('Jane');
    });

    it('should verify identity again on check-in (never trust the lookup step)', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(appointment);

      await expect(
        appointmentsService.kioskCheckIn({ confirmationCode: 'K7QM4XWD', dateOfBirth: '1999-12-31' })
      ).rejects.toMatchObject({ message: GENERIC });
      expect(appointmentsRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('check-in rules still apply', () => {
    it.each(['cancelled', 'completed', 'no_show'])('should reject a %s appointment', async (status) => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue({ ...appointment, status });

      await expect(
        appointmentsService.kioskCheckIn({ confirmationCode: 'K7QM4XWD', dateOfBirth: '1985-03-09' })
      ).rejects.toMatchObject({ type: 'conflict' });
      expect(appointmentsRepo.update).not.toHaveBeenCalled();
    });

    it('should reject a patient who is already checked in', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue({ ...appointment, checked_in: true });

      await expect(
        appointmentsService.kioskLookup({ confirmationCode: 'K7QM4XWD', dateOfBirth: '1985-03-09' })
      ).rejects.toMatchObject({ message: 'Appointment is already checked in', type: 'conflict' });
    });
  });
});
