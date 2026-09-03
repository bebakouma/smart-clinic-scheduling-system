const fc = require('fast-check');
const waitlistService = require('../../src/services/waitlist.service');
const waitlistRepo = require('../../src/repositories/waitlist.repository');

jest.mock('../../src/repositories/waitlist.repository');

describe('Waitlist Service - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Arbitrary: a valid appointment type
  const apptType = () => fc.constantFrom('checkup', 'consultation', 'follow_up', 'procedure');

  // Arbitrary: an optional preferred date (ISO date string) or null
  const optionalDate = () =>
    fc.option(
      fc.date({ min: new Date('2026-01-01'), max: new Date('2030-01-01') })
        .map(d => d.toISOString()),
      { nil: null }
    );

  // ============================================================
  // Property 11: Waitlist entry creation defaults to "waiting"
  // Validates: Requirement 7.1
  // ============================================================
  describe('Property 11: Waitlist entry creation defaults to waiting', () => {
    it('should always create entries with status "waiting" regardless of input', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          apptType(),
          optionalDate(),
          async (patientId, type, preferredDate) => {
            // Repo echoes back whatever data the service passes to it
            waitlistRepo.create.mockImplementation(data =>
              Promise.resolve({ id: 1, ...data, created_at: new Date() })
            );

            const result = await waitlistService.create({
              patient_id: patientId,
              requested_appointment_type: type,
              preferred_date: preferredDate
            });

            expect(result.status).toBe('waiting');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================
  // Property 7: Cancellation triggers waitlist notification
  // Validates: Requirements 4.1, 4.2, 7.3
  // ============================================================
  describe('Property 7: Cancellation notifies the oldest matching waitlist entry', () => {
    it('should mark the first (oldest) matching entry as "notified" with a timestamp', () => {
      return fc.assert(
        fc.asyncProperty(
          apptType(),
          fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 1, maxLength: 5 }),
          async (type, entryIds) => {
            const cancelledAppointment = {
              id: 999,
              appointment_type: type,
              appointment_datetime: new Date('2026-06-01T10:00:00Z')
            };

            // Matches returned oldest-first (repo guarantees ordering)
            const matches = entryIds.map((id, i) => ({
              id,
              status: 'waiting',
              created_at: new Date(2026, 0, 1 + i)
            }));

            waitlistRepo.findMatchingEntries.mockResolvedValue(matches);
            waitlistRepo.update.mockImplementation((id, data) =>
              Promise.resolve({ id, ...data })
            );

            const result = await waitlistService.processCancellation(cancelledAppointment);

            // The oldest match (first in the list) is the one notified
            expect(waitlistRepo.update).toHaveBeenCalledWith(
              matches[0].id,
              expect.objectContaining({ status: 'notified', notified_at: expect.any(Date) })
            );
            expect(result.status).toBe('notified');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return null when there are no matching entries', () => {
      return fc.assert(
        fc.asyncProperty(apptType(), async (type) => {
          waitlistRepo.findMatchingEntries.mockResolvedValue([]);

          const result = await waitlistService.processCancellation({
            id: 1,
            appointment_type: type,
            appointment_datetime: new Date('2026-06-01T10:00:00Z')
          });

          expect(result).toBeNull();
          expect(waitlistRepo.update).not.toHaveBeenCalled();
        }),
        { numRuns: 30 }
      );
    });
  });
});
