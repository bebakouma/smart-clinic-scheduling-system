const intakeService = require('../../src/services/intake.service');
const intakeRepo = require('../../src/repositories/intake.repository');
const appointmentsRepo = require('../../src/repositories/appointments.repository');

jest.mock('../../src/repositories/intake.repository');
jest.mock('../../src/repositories/appointments.repository');

describe('Intake Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an intake form when the appointment exists', async () => {
      appointmentsRepo.findById.mockResolvedValue({ id: 5, patient_id: 3 });
      intakeRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

      const result = await intakeService.create({
        appointment_id: 5,
        reason_for_visit: 'Annual checkup'
      });

      expect(result.appointment_id).toBe(5);
      expect(result.patient_id).toBe(3); // taken from the appointment
      expect(result.reason_for_visit).toBe('Annual checkup');
    });

    it('should link the intake form to the appointment\'s patient', async () => {
      appointmentsRepo.findById.mockResolvedValue({ id: 8, patient_id: 42 });
      intakeRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

      await intakeService.create({ appointment_id: 8, reason_for_visit: 'Follow-up' });

      expect(intakeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ appointment_id: 8, patient_id: 42 })
      );
    });

    it('should default optional fields to null when not provided', async () => {
      appointmentsRepo.findById.mockResolvedValue({ id: 1, patient_id: 1 });
      intakeRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

      await intakeService.create({ appointment_id: 1, reason_for_visit: 'Cough' });

      expect(intakeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          insurance_provider: null,
          allergies: null,
          medications: null,
          notes: null
        })
      );
    });

    it('should reject creation when the appointment does not exist', async () => {
      appointmentsRepo.findById.mockResolvedValue(null);

      await expect(
        intakeService.create({ appointment_id: 999, reason_for_visit: 'Test' })
      ).rejects.toMatchObject({
        message: 'Appointment not found',
        type: 'validation'
      });
      expect(intakeRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getByAppointmentId', () => {
    it('should return the intake form when found', async () => {
      const form = { id: 1, appointment_id: 5, reason_for_visit: 'Checkup' };
      intakeRepo.findByAppointmentId.mockResolvedValue(form);

      const result = await intakeService.getByAppointmentId(5);

      expect(result).toEqual(form);
    });

    it('should throw not_found when no intake form exists for the appointment', async () => {
      intakeRepo.findByAppointmentId.mockResolvedValue(null);

      await expect(intakeService.getByAppointmentId(5)).rejects.toMatchObject({
        message: 'Intake form not found',
        type: 'not_found'
      });
    });
  });
});
