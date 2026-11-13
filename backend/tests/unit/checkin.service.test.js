const appointmentsService = require('../../src/services/appointments.service');
const appointmentsRepo = require('../../src/repositories/appointments.repository');

jest.mock('../../src/repositories/appointments.repository');

describe('Appointment check-in (Task 22)', () => {
  beforeEach(() => jest.clearAllMocks());

  const baseAppointment = {
    id: 1,
    patient_id: 1,
    provider_name: 'Dr. Smith',
    appointment_type: 'checkup',
    appointment_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    status: 'scheduled',
    checked_in: false,
    checked_in_at: null,
    confirmation_code: 'ABC123'
  };

  describe('lookup', () => {
    it('should require an appointment id or confirmation code', async () => {
      await expect(appointmentsService.checkIn({})).rejects.toMatchObject({
        type: 'validation'
      });
      expect(appointmentsRepo.findById).not.toHaveBeenCalled();
      expect(appointmentsRepo.findByConfirmationCode).not.toHaveBeenCalled();
    });

    it('should look up by appointment id when provided', async () => {
      appointmentsRepo.findById.mockResolvedValue(baseAppointment);
      appointmentsRepo.update.mockResolvedValue({ ...baseAppointment, checked_in: true });

      await appointmentsService.checkIn({ appointmentId: 1 });

      expect(appointmentsRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should look up by confirmation code when provided', async () => {
      appointmentsRepo.findByConfirmationCode.mockResolvedValue(baseAppointment);
      appointmentsRepo.update.mockResolvedValue({ ...baseAppointment, checked_in: true });

      await appointmentsService.checkIn({ confirmationCode: 'ABC123' });

      expect(appointmentsRepo.findByConfirmationCode).toHaveBeenCalledWith('ABC123');
    });

    it('should reject when the appointment is not found', async () => {
      appointmentsRepo.findById.mockResolvedValue(null);

      await expect(appointmentsService.checkIn({ appointmentId: 999 })).rejects.toMatchObject({
        message: 'Appointment not found',
        type: 'not_found'
      });
    });
  });

  describe('check-in rules', () => {
    it('should check in a valid scheduled appointment and set checked_in + timestamp', async () => {
      appointmentsRepo.findById.mockResolvedValue(baseAppointment);
      appointmentsRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ ...baseAppointment, ...data })
      );

      const result = await appointmentsService.checkIn({ appointmentId: 1 });

      const updateArg = appointmentsRepo.update.mock.calls[0][1];
      expect(updateArg.checked_in).toBe(true);
      expect(updateArg.checked_in_at).toBeInstanceOf(Date);
      expect(updateArg.status).toBe('checked_in');
      expect(result.checked_in).toBe(true);
    });

    it('should check in a confirmed appointment', async () => {
      appointmentsRepo.findById.mockResolvedValue({ ...baseAppointment, status: 'confirmed' });
      appointmentsRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ ...baseAppointment, status: 'confirmed', ...data })
      );

      const result = await appointmentsService.checkIn({ appointmentId: 1 });
      expect(result.checked_in).toBe(true);
    });

    it('should reject check-in for a cancelled appointment', async () => {
      appointmentsRepo.findById.mockResolvedValue({ ...baseAppointment, status: 'cancelled' });

      await expect(appointmentsService.checkIn({ appointmentId: 1 })).rejects.toMatchObject({
        message: 'Cannot check in a cancelled appointment',
        type: 'conflict'
      });
      expect(appointmentsRepo.update).not.toHaveBeenCalled();
    });

    it('should reject check-in for a completed appointment', async () => {
      appointmentsRepo.findById.mockResolvedValue({ ...baseAppointment, status: 'completed' });

      await expect(appointmentsService.checkIn({ appointmentId: 1 })).rejects.toMatchObject({
        message: 'Cannot check in a completed appointment',
        type: 'conflict'
      });
    });

    it('should reject check-in for a no_show appointment', async () => {
      appointmentsRepo.findById.mockResolvedValue({ ...baseAppointment, status: 'no_show' });

      await expect(appointmentsService.checkIn({ appointmentId: 1 })).rejects.toMatchObject({
        message: 'Cannot check in a no_show appointment',
        type: 'conflict'
      });
    });

    it('should reject a second check-in when already checked in', async () => {
      appointmentsRepo.findById.mockResolvedValue({
        ...baseAppointment,
        checked_in: true,
        checked_in_at: new Date()
      });

      await expect(appointmentsService.checkIn({ appointmentId: 1 })).rejects.toMatchObject({
        message: 'Appointment is already checked in',
        type: 'conflict'
      });
      expect(appointmentsRepo.update).not.toHaveBeenCalled();
    });
  });
});
