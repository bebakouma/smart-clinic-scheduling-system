const waitlistService = require('../../src/services/waitlist.service');
const waitlistRepo = require('../../src/repositories/waitlist.repository');

jest.mock('../../src/repositories/waitlist.repository');

describe('Waitlist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────
  describe('create', () => {
    it('should create a waitlist entry with status "waiting"', async () => {
      const input = {
        patient_id: 1,
        requested_appointment_type: 'checkup',
        preferred_date: '2026-08-01',
        preferred_time_range: 'morning'
      };

      waitlistRepo.create.mockImplementation(data =>
        Promise.resolve({ id: 1, ...data, created_at: new Date() })
      );

      const result = await waitlistService.create(input);

      expect(result.status).toBe('waiting');
      expect(result.requested_appointment_type).toBe('checkup');
      expect(result.preferred_date).toEqual(new Date('2026-08-01'));
    });

    it('should set preferred_date and preferred_time_range to null when not provided', async () => {
      waitlistRepo.create.mockImplementation(data =>
        Promise.resolve({ id: 1, ...data, created_at: new Date() })
      );

      const result = await waitlistService.create({
        patient_id: 1,
        requested_appointment_type: 'follow_up'
      });

      expect(result.preferred_date).toBeNull();
      expect(result.preferred_time_range).toBeNull();
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe('getById', () => {
    it('should return the entry when found', async () => {
      const mockEntry = { id: 1, patient_id: 1, status: 'waiting' };
      waitlistRepo.findById.mockResolvedValue(mockEntry);

      const result = await waitlistService.getById(1);
      expect(result).toEqual(mockEntry);
    });

    it('should throw not_found when entry does not exist', async () => {
      waitlistRepo.findById.mockResolvedValue(null);

      await expect(waitlistService.getById(999)).rejects.toMatchObject({
        message: 'Waitlist entry not found',
        type: 'not_found'
      });
    });
  });

  // ── processCancellation ───────────────────────────────────────
  describe('processCancellation', () => {
    const cancelledAppointment = {
      id: 10,
      appointment_type: 'checkup',
      appointment_datetime: new Date('2026-08-01T10:00:00Z')
    };

    it('should notify the first (oldest) matching waitlist entry', async () => {
      const matches = [
        { id: 1, patient_id: 1, status: 'waiting', created_at: new Date('2026-06-01') },
        { id: 2, patient_id: 2, status: 'waiting', created_at: new Date('2026-06-05') }
      ];

      waitlistRepo.findMatchingEntries.mockResolvedValue(matches);
      waitlistRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ id, ...data })
      );

      const result = await waitlistService.processCancellation(cancelledAppointment);

      // Should pick the oldest entry (id: 1)
      expect(waitlistRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'notified',
        notified_at: expect.any(Date)
      }));
      expect(result.status).toBe('notified');
    });

    it('should return null when no matching waitlist entries exist', async () => {
      waitlistRepo.findMatchingEntries.mockResolvedValue([]);

      const result = await waitlistService.processCancellation(cancelledAppointment);

      expect(result).toBeNull();
      expect(waitlistRepo.update).not.toHaveBeenCalled();
    });

    it('should match by appointment type', async () => {
      waitlistRepo.findMatchingEntries.mockResolvedValue([]);

      await waitlistService.processCancellation({
        ...cancelledAppointment,
        appointment_type: 'consultation'
      });

      expect(waitlistRepo.findMatchingEntries).toHaveBeenCalledWith(
        'consultation',
        expect.any(Date)
      );
    });

    it('should select oldest entry when multiple match same type and date (tie-breaking by created_at)', async () => {
      // Simulate repo already returning sorted oldest-first (created_at asc, id asc)
      const matches = [
        { id: 3, patient_id: 3, status: 'waiting', created_at: new Date('2026-05-01T08:00:00Z') },
        { id: 7, patient_id: 7, status: 'waiting', created_at: new Date('2026-05-01T08:00:00Z') },
        { id: 9, patient_id: 9, status: 'waiting', created_at: new Date('2026-05-02T09:00:00Z') }
      ];

      waitlistRepo.findMatchingEntries.mockResolvedValue(matches);
      waitlistRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ id, ...data })
      );

      await waitlistService.processCancellation(cancelledAppointment);

      // When created_at ties, lowest id wins (id: 3, not id: 7)
      expect(waitlistRepo.update).toHaveBeenCalledWith(3, expect.objectContaining({
        status: 'notified'
      }));
    });
  });

  // ── updateStatus ──────────────────────────────────────────────
  describe('updateStatus', () => {
    it('should update status and set notified_at when status is "notified"', async () => {
      waitlistRepo.findById.mockResolvedValue({ id: 1, status: 'waiting' });
      waitlistRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ id, ...data })
      );

      const result = await waitlistService.updateStatus(1, 'notified');

      expect(result.status).toBe('notified');
      expect(result.notified_at).toBeInstanceOf(Date);
    });

    it('should update status without setting notified_at for other statuses', async () => {
      waitlistRepo.findById.mockResolvedValue({ id: 1, status: 'waiting' });
      waitlistRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ id, ...data })
      );

      const result = await waitlistService.updateStatus(1, 'booked');

      expect(result.status).toBe('booked');
      expect(result.notified_at).toBeUndefined();
    });

    it('should throw not_found when entry does not exist', async () => {
      waitlistRepo.findById.mockResolvedValue(null);

      await expect(waitlistService.updateStatus(999, 'booked')).rejects.toMatchObject({
        type: 'not_found'
      });
    });
  });
});
