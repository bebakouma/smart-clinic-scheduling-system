const deviceService = require('../../src/services/device.service');
const appointmentsService = require('../../src/services/appointments.service');

jest.mock('../../src/services/appointments.service');

describe('Device event handling (Task 24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deviceService._reset();
  });

  describe('occupancy events', () => {
    it('should keep the latest count for each device', async () => {
      await deviceService.handleEvent({ deviceId: 'door-1', type: 'occupancy', count: 3 });
      await deviceService.handleEvent({ deviceId: 'door-1', type: 'occupancy', count: 5 });
      await deviceService.handleEvent({ deviceId: 'door-2', type: 'occupancy', count: 1 });

      const byDevice = Object.fromEntries(
        deviceService.getOccupancy().map((d) => [d.deviceId, d.count])
      );
      expect(byDevice).toEqual({ 'door-1': 5, 'door-2': 1 });
    });

    it('should record when the count was received', async () => {
      await deviceService.handleEvent({ deviceId: 'door-1', type: 'occupancy', count: 2 });

      expect(deviceService.getOccupancy()[0].received_at).toBeInstanceOf(Date);
    });

    it('should accept a count of zero', async () => {
      const result = await deviceService.handleEvent({ deviceId: 'door-1', type: 'occupancy', count: 0 });

      expect(result).toEqual({ type: 'occupancy', accepted: true });
      expect(deviceService.getOccupancy()[0].count).toBe(0);
    });

    it('should not touch appointments', async () => {
      await deviceService.handleEvent({ deviceId: 'door-1', type: 'occupancy', count: 2 });

      expect(appointmentsService.checkIn).not.toHaveBeenCalled();
    });
  });

  describe('check-in events', () => {
    const checkedIn = {
      id: 7,
      status: 'checked_in',
      checked_in_at: new Date('2030-01-01T10:00:00Z'),
      patient: { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }
    };

    it('should check the patient in by the scanned confirmation code', async () => {
      appointmentsService.checkIn.mockResolvedValue(checkedIn);

      await deviceService.handleEvent({ deviceId: 'door-1', type: 'checkin', confirmationCode: 'K7QM4XWD' });

      expect(appointmentsService.checkIn).toHaveBeenCalledWith({ confirmationCode: 'K7QM4XWD' });
    });

    it('should normalize a code typed or scanned with spaces, dashes, or lowercase', async () => {
      appointmentsService.checkIn.mockResolvedValue(checkedIn);

      await deviceService.handleEvent({ deviceId: 'door-1', type: 'checkin', confirmationCode: ' k7qm-4xwd ' });

      expect(appointmentsService.checkIn).toHaveBeenCalledWith({ confirmationCode: 'K7QM4XWD' });
    });

    it('should return only the appointment id, status and time (no patient details)', async () => {
      appointmentsService.checkIn.mockResolvedValue(checkedIn);

      const result = await deviceService.handleEvent({
        deviceId: 'door-1',
        type: 'checkin',
        confirmationCode: 'K7QM4XWD'
      });

      expect(Object.keys(result).sort()).toEqual(['appointment_id', 'checked_in_at', 'status', 'type']);
      expect(result.appointment_id).toBe(7);
      expect(JSON.stringify(result)).not.toContain('Jane');
      expect(JSON.stringify(result)).not.toContain('jane@example.com');
    });

    it('should pass on the error when the appointment cannot be checked in', async () => {
      const err = new Error('Appointment is already checked in');
      err.type = 'conflict';
      appointmentsService.checkIn.mockRejectedValue(err);

      await expect(
        deviceService.handleEvent({ deviceId: 'door-1', type: 'checkin', confirmationCode: 'K7QM4XWD' })
      ).rejects.toMatchObject({ type: 'conflict' });
    });
  });
});
