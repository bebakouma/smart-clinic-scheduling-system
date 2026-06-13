const appointmentsService = require('../../src/services/appointments.service');
const appointmentsRepo = require('../../src/repositories/appointments.repository');
const patientsRepo = require('../../src/repositories/patients.repository');

// Mock the repositories
jest.mock('../../src/repositories/appointments.repository');
jest.mock('../../src/repositories/patients.repository');

describe('Appointments Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reschedule', () => {
    const mockAppointment = {
      id: 1,
      patient_id: 1,
      provider_name: 'Dr. Smith',
      appointment_type: 'checkup',
      appointment_datetime: new Date('2026-07-01T10:00:00Z'),
      status: 'scheduled',
      notes: null,
      patient: { id: 1, first_name: 'John', last_name: 'Doe' }
    };

    it('should reschedule an appointment to a new valid time', async () => {
      const newDatetime = '2026-07-15T14:00:00Z';
      appointmentsRepo.findById.mockResolvedValue(mockAppointment);
      appointmentsRepo.findConflict.mockResolvedValue(null);
      appointmentsRepo.update.mockResolvedValue({
        ...mockAppointment,
        appointment_datetime: new Date(newDatetime)
      });

      const result = await appointmentsService.reschedule(1, newDatetime);

      expect(appointmentsRepo.findConflict).toHaveBeenCalledWith(
        'Dr. Smith',
        expect.any(Date),
        expect.any(Date),
        1
      );
      expect(appointmentsRepo.update).toHaveBeenCalledWith(1, {
        appointment_datetime: new Date(newDatetime),
        status: 'scheduled',
        notes: null
      });
      expect(result.appointment_datetime).toEqual(new Date(newDatetime));
    });

    it('should reject rescheduling to a past date', async () => {
      appointmentsRepo.findById.mockResolvedValue(mockAppointment);

      await expect(
        appointmentsService.reschedule(1, '2020-01-01T10:00:00Z')
      ).rejects.toMatchObject({
        message: 'New appointment date must be in the future',
        type: 'validation'
      });
    });

    it('should reject rescheduling a cancelled appointment', async () => {
      appointmentsRepo.findById.mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled'
      });

      await expect(
        appointmentsService.reschedule(1, '2026-08-01T10:00:00Z')
      ).rejects.toMatchObject({
        message: 'Cannot reschedule cancelled appointment',
        type: 'conflict'
      });
    });

    it('should reject rescheduling when provider has a conflict', async () => {
      appointmentsRepo.findById.mockResolvedValue(mockAppointment);
      appointmentsRepo.findConflict.mockResolvedValue({ id: 2 }); // conflict exists

      await expect(
        appointmentsService.reschedule(1, '2026-07-15T14:00:00Z')
      ).rejects.toMatchObject({
        message: 'Provider has a scheduling conflict at the new time',
        type: 'conflict'
      });
    });

    it('should append reschedule reason to notes', async () => {
      const newDatetime = '2026-07-15T14:00:00Z';
      appointmentsRepo.findById.mockResolvedValue(mockAppointment);
      appointmentsRepo.findConflict.mockResolvedValue(null);
      appointmentsRepo.update.mockResolvedValue({
        ...mockAppointment,
        appointment_datetime: new Date(newDatetime),
        notes: 'Rescheduled: Patient requested'
      });

      await appointmentsService.reschedule(1, newDatetime, 'Patient requested');

      expect(appointmentsRepo.update).toHaveBeenCalledWith(1, {
        appointment_datetime: new Date(newDatetime),
        status: 'scheduled',
        notes: 'Rescheduled: Patient requested'
      });
    });
  });

  describe('create', () => {
    it('should reject if patient does not exist', async () => {
      patientsRepo.findById.mockResolvedValue(null);

      await expect(
        appointmentsService.create({
          patient_id: 999,
          provider_name: 'Dr. Smith',
          appointment_type: 'checkup',
          appointment_datetime: '2026-08-01T10:00:00Z'
        })
      ).rejects.toMatchObject({
        message: 'Patient not found',
        type: 'validation'
      });
    });

    it('should reject appointment in the past', async () => {
      patientsRepo.findById.mockResolvedValue({ id: 1 });

      await expect(
        appointmentsService.create({
          patient_id: 1,
          provider_name: 'Dr. Smith',
          appointment_type: 'checkup',
          appointment_datetime: '2020-01-01T10:00:00Z'
        })
      ).rejects.toMatchObject({
        message: 'Appointment date must be in the future',
        type: 'validation'
      });
    });

    it('should reject when provider has a scheduling conflict', async () => {
      patientsRepo.findById.mockResolvedValue({ id: 1 });
      appointmentsRepo.findConflict.mockResolvedValue({ id: 5 });

      await expect(
        appointmentsService.create({
          patient_id: 1,
          provider_name: 'Dr. Smith',
          appointment_type: 'checkup',
          appointment_datetime: '2026-08-01T10:00:00Z'
        })
      ).rejects.toMatchObject({
        message: 'Provider has a scheduling conflict',
        type: 'conflict'
      });
    });
  });

  describe('updateStatus', () => {
    const mockAppointment = {
      id: 1,
      status: 'scheduled',
      provider_name: 'Dr. Smith',
      appointment_type: 'checkup',
      appointment_datetime: new Date('2026-07-01T10:00:00Z')
    };

    it('should reject invalid status values', async () => {
      await expect(
        appointmentsService.updateStatus(1, 'invalid_status')
      ).rejects.toMatchObject({
        type: 'validation'
      });
    });

    it('should reject status change on completed appointment', async () => {
      appointmentsRepo.findById.mockResolvedValue({
        ...mockAppointment,
        status: 'completed'
      });

      await expect(
        appointmentsService.updateStatus(1, 'cancelled')
      ).rejects.toMatchObject({
        message: 'Cannot modify completed appointment',
        type: 'conflict'
      });
    });
  });
});
