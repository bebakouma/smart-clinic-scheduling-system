const remindersService = require('../../src/services/reminders.service');
const remindersRepo = require('../../src/repositories/reminders.repository');

// Mock the reminders repository
jest.mock('../../src/repositories/reminders.repository');

// Mock prisma used directly in reminders.service.js
jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: {
      findMany: jest.fn()
    }
  }
}));

const { prisma } = require('../../src/config/database');

describe('Reminders Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper: build a mock appointment
  const makeAppointment = (overrides = {}) => ({
    id: 1,
    patient_id: 1,
    appointment_type: 'checkup',
    provider_name: 'Dr. Smith',
    appointment_datetime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6h from now
    status: 'scheduled',
    reminder_logs: [],
    patient: { id: 1, preferred_contact_method: 'email' },
    ...overrides
  });

  // ── 24-hour window filtering ───────────────────────────────────
  describe('runReminders - 24-hour window filtering', () => {
    it('should send a reminder for an appointment within 24 hours', async () => {
      const appt = makeAppointment();
      prisma.appointment.findMany.mockResolvedValue([appt]);
      remindersRepo.create.mockResolvedValue({
        id: 1,
        appointment_id: appt.id,
        patient_id: appt.patient_id,
        status: 'sent',
        reminder_type: 'email'
      });

      const results = await remindersService.runReminders();

      expect(remindersRepo.create).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('sent');
    });

    it('should return empty array when no appointments are within 24 hours', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      const results = await remindersService.runReminders();

      expect(remindersRepo.create).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });
  });

  // ── cancelled appointment exclusion ───────────────────────────
  describe('runReminders - cancelled appointment exclusion', () => {
    it('should not send reminders for cancelled appointments', async () => {
      // The prisma query already filters out cancelled via status: { not: 'cancelled' }
      // so the service would never receive cancelled appointments — we verify the query
      prisma.appointment.findMany.mockResolvedValue([]);

      await remindersService.runReminders();

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'cancelled' }
          })
        })
      );
    });
  });

  // ── duplicate reminder prevention ─────────────────────────────
  describe('runReminders - duplicate reminder prevention', () => {
    it('should skip appointments that already have a reminder log', async () => {
      const appt = makeAppointment({
        reminder_logs: [{ id: 99, appointment_id: 1 }] // already reminded
      });
      prisma.appointment.findMany.mockResolvedValue([appt]);

      const results = await remindersService.runReminders();

      expect(remindersRepo.create).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    it('should only remind appointments with no existing logs', async () => {
      const alreadyReminded = makeAppointment({
        id: 1,
        reminder_logs: [{ id: 10, appointment_id: 1 }]
      });
      const notYetReminded = makeAppointment({ id: 2, reminder_logs: [] });

      prisma.appointment.findMany.mockResolvedValue([alreadyReminded, notYetReminded]);
      remindersRepo.create.mockResolvedValue({
        id: 20,
        appointment_id: 2,
        status: 'sent'
      });

      const results = await remindersService.runReminders();

      expect(remindersRepo.create).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });
  });

  // ── reminder content ──────────────────────────────────────────
  describe('runReminders - reminder content', () => {
    it('should use patient preferred_contact_method as reminder_type', async () => {
      const appt = makeAppointment({
        patient: { id: 1, preferred_contact_method: 'sms' }
      });
      prisma.appointment.findMany.mockResolvedValue([appt]);
      remindersRepo.create.mockResolvedValue({ id: 1, status: 'sent' });

      await remindersService.runReminders();

      expect(remindersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reminder_type: 'sms' })
      );
    });

    it('should default reminder_type to "email" when preferred_contact_method is missing', async () => {
      const appt = makeAppointment({
        patient: { id: 1, preferred_contact_method: null }
      });
      prisma.appointment.findMany.mockResolvedValue([appt]);
      remindersRepo.create.mockResolvedValue({ id: 1, status: 'sent' });

      await remindersService.runReminders();

      expect(remindersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reminder_type: 'email' })
      );
    });

    it('should include appointment details in the reminder message', async () => {
      const appt = makeAppointment();
      prisma.appointment.findMany.mockResolvedValue([appt]);
      remindersRepo.create.mockResolvedValue({ id: 1, status: 'sent' });

      await remindersService.runReminders();

      const callArg = remindersRepo.create.mock.calls[0][0];
      expect(callArg.message).toContain(appt.appointment_type);
      expect(callArg.message).toContain(appt.provider_name);
    });
  });
});
