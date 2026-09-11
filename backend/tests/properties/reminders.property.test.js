const fc = require('fast-check');
const remindersService = require('../../src/services/reminders.service');
const remindersRepo = require('../../src/repositories/reminders.repository');

jest.mock('../../src/repositories/reminders.repository');

// Mock prisma used directly in reminders.service.js
jest.mock('../../src/config/database', () => ({
  prisma: {
    appointment: { findMany: jest.fn() }
  }
}));

const { prisma } = require('../../src/config/database');

describe('Reminders Service - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const apptType = () => fc.constantFrom('checkup', 'consultation', 'follow_up', 'procedure');
  const contactMethod = () => fc.option(fc.constantFrom('email', 'phone', 'sms'), { nil: null });

  // Build a mock appointment that the service would receive AFTER the
  // prisma query has already filtered to within-24h and non-cancelled.
  const makeAppointment = (id, type, contact, alreadyReminded) => ({
    id,
    patient_id: id,
    appointment_type: type,
    provider_name: 'Dr. Smith',
    appointment_datetime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    status: 'scheduled',
    reminder_logs: alreadyReminded ? [{ id: 100 + id, appointment_id: id }] : [],
    patient: { id, preferred_contact_method: contact }
  });

  // ============================================================
  // Property 9: Reminder eligibility filtering
  // Validates: Requirements 6.1, 6.3
  // Only appointments that (a) are in the query window, (b) not cancelled,
  // and (c) have no existing reminder log should generate a reminder.
  // ============================================================
  describe('Property 9: Reminder eligibility filtering', () => {
    it('should only create reminders for appointments with no existing reminder log', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              type: apptType(),
              contact: contactMethod(),
              alreadyReminded: fc.boolean()
            }),
            { minLength: 0, maxLength: 8 }
          ),
          async (specs) => {
            // Ensure unique ids
            const seen = new Set();
            const unique = specs.filter(s => {
              if (seen.has(s.id)) return false;
              seen.add(s.id);
              return true;
            });

            // Reset call counts for each property iteration (fast-check runs
            // this body many times within a single test)
            remindersRepo.create.mockReset();
            prisma.appointment.findMany.mockReset();

            const appts = unique.map(s =>
              makeAppointment(s.id, s.type, s.contact, s.alreadyReminded)
            );
            prisma.appointment.findMany.mockResolvedValue(appts);
            remindersRepo.create.mockImplementation(data =>
              Promise.resolve({ id: 1, ...data })
            );

            const results = await remindersService.runReminders();

            const expectedCount = unique.filter(s => !s.alreadyReminded).length;
            expect(results).toHaveLength(expectedCount);
            expect(remindersRepo.create).toHaveBeenCalledTimes(expectedCount);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always query only non-cancelled appointments within the next 24 hours', () => {
      return fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          prisma.appointment.findMany.mockResolvedValue([]);

          await remindersService.runReminders();

          const queryArg = prisma.appointment.findMany.mock.calls[0][0];
          expect(queryArg.where.status).toEqual({ not: 'cancelled' });
          expect(queryArg.where.appointment_datetime.gte).toBeInstanceOf(Date);
          expect(queryArg.where.appointment_datetime.lte).toBeInstanceOf(Date);
          // Window is roughly 24 hours
          const diffMs =
            queryArg.where.appointment_datetime.lte.getTime() -
            queryArg.where.appointment_datetime.gte.getTime();
          expect(diffMs).toBe(24 * 60 * 60 * 1000);
        }),
        { numRuns: 10 }
      );
    });
  });

  // ============================================================
  // Property 10: Reminder log completeness
  // Validates: Requirement 6.2
  // Every generated log has appointment_id, patient_id, reminder_type,
  // status, and a non-empty message.
  // ============================================================
  describe('Property 10: Reminder log completeness', () => {
    it('should create complete log entries for every eligible appointment', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          apptType(),
          contactMethod(),
          async (id, type, contact) => {
            remindersRepo.create.mockReset();
            prisma.appointment.findMany.mockReset();

            const appt = makeAppointment(id, type, contact, false);
            prisma.appointment.findMany.mockResolvedValue([appt]);

            let captured = null;
            remindersRepo.create.mockImplementation(data => {
              captured = data;
              return Promise.resolve({ id: 1, ...data });
            });

            await remindersService.runReminders();

            expect(captured).not.toBeNull();
            expect(captured.appointment_id).toBe(id);
            expect(captured.patient_id).toBe(id);
            expect(['email', 'phone', 'sms']).toContain(captured.reminder_type);
            expect(captured.status).toBe('sent');
            expect(typeof captured.message).toBe('string');
            expect(captured.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
