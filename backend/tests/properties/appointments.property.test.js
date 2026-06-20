const fc = require('fast-check');
const appointmentsService = require('../../src/services/appointments.service');
const appointmentsRepo = require('../../src/repositories/appointments.repository');
const patientsRepo = require('../../src/repositories/patients.repository');
const waitlistService = require('../../src/services/waitlist.service');

jest.mock('../../src/repositories/appointments.repository');
jest.mock('../../src/repositories/patients.repository');
jest.mock('../../src/services/waitlist.service');

describe('Appointments Service - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    waitlistService.processCancellation.mockResolvedValue(undefined);
  });

  // Arbitrary: generates a future ISO datetime string
  const futureDate = () =>
    fc.date({
      min: new Date(Date.now() + 60 * 60 * 1000), // at least 1 hour ahead
      max: new Date('2030-12-31T23:59:59Z')
    }).map(d => d.toISOString());

  // Arbitrary: generates a past ISO datetime string
  const pastDate = () =>
    fc.date({
      min: new Date('2000-01-01T00:00:00Z'),
      max: new Date(Date.now() - 60 * 60 * 1000) // at least 1 hour ago
    }).map(d => d.toISOString());

  // Arbitrary: generates a provider name
  const providerName = () => fc.stringMatching(/^[A-Za-z]{3,20}$/).map(s => `Dr. ${s}`);

  // Arbitrary: generates an appointment type
  const appointmentType = () => fc.constantFrom('checkup', 'follow_up', 'consultation', 'procedure', 'urgent');

  // ============================================================
  // Property 3: Appointment creation always defaults to 'scheduled'
  // Validates: Requirement 2.1
  // ============================================================
  describe('Property 3: Appointment creation defaults to scheduled', () => {
    it('should always set status to "scheduled" regardless of input', () => {
      return fc.assert(
        fc.asyncProperty(
          providerName(),
          appointmentType(),
          futureDate(),
          fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
          async (provider, type, datetime, notes) => {
            patientsRepo.findById.mockResolvedValue({ id: 1 });
            appointmentsRepo.findConflict.mockResolvedValue(null);
            appointmentsRepo.create.mockImplementation(data => Promise.resolve({
              id: 1,
              ...data,
              patient: { id: 1, first_name: 'Test', last_name: 'Patient' }
            }));

            const result = await appointmentsService.create({
              patient_id: 1,
              provider_name: provider,
              appointment_type: type,
              appointment_datetime: datetime,
              notes: notes
            });

            expect(result.status).toBe('scheduled');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================
  // Property 4: Past date rejection
  // Validates: Requirements 2.4, 3.2
  // ============================================================
  describe('Property 4: Past date rejection', () => {
    it('should always reject appointment creation with any past date', () => {
      return fc.assert(
        fc.asyncProperty(
          providerName(),
          appointmentType(),
          pastDate(),
          async (provider, type, datetime) => {
            patientsRepo.findById.mockResolvedValue({ id: 1 });

            await expect(
              appointmentsService.create({
                patient_id: 1,
                provider_name: provider,
                appointment_type: type,
                appointment_datetime: datetime
              })
            ).rejects.toMatchObject({
              type: 'validation'
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always reject rescheduling to any past date', () => {
      return fc.assert(
        fc.asyncProperty(pastDate(), async (datetime) => {
          appointmentsRepo.findById.mockResolvedValue({
            id: 1,
            status: 'scheduled',
            provider_name: 'Dr. Smith',
            appointment_datetime: new Date('2026-08-01T10:00:00Z')
          });

          await expect(
            appointmentsService.reschedule(1, datetime)
          ).rejects.toMatchObject({
            type: 'validation'
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================
  // Property 5: Reschedule preserves non-date fields
  // Validates: Requirement 3.1
  // ============================================================
  describe('Property 5: Reschedule preserves non-date fields', () => {
    it('should only change datetime, status, and notes — preserving provider and type', () => {
      return fc.assert(
        fc.asyncProperty(
          providerName(),
          appointmentType(),
          futureDate(),
          async (provider, type, newDatetime) => {
            const original = {
              id: 1,
              patient_id: 1,
              provider_name: provider,
              appointment_type: type,
              appointment_datetime: new Date('2026-07-01T10:00:00Z'),
              status: 'scheduled',
              notes: null
            };

            appointmentsRepo.findById.mockResolvedValue(original);
            appointmentsRepo.findConflict.mockResolvedValue(null);
            appointmentsRepo.update.mockImplementation((id, data) =>
              Promise.resolve({ ...original, ...data })
            );

            const result = await appointmentsService.reschedule(1, newDatetime);

            // Provider and type must remain unchanged
            expect(result.provider_name).toBe(provider);
            expect(result.appointment_type).toBe(type);
            expect(result.patient_id).toBe(1);
            // Datetime must be updated
            expect(result.appointment_datetime).toEqual(new Date(newDatetime));
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================
  // Property 6: Terminal status appointments cannot be modified
  // Validates: Requirements 3.3, 4.3
  // ============================================================
  describe('Property 6: Terminal status appointments cannot be modified', () => {
    const terminalStatus = () => fc.constantFrom('cancelled', 'completed');
    const anyValidStatus = () => fc.constantFrom('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');

    it('should reject status updates on terminal-status appointments', () => {
      return fc.assert(
        fc.asyncProperty(
          terminalStatus(),
          anyValidStatus(),
          async (currentStatus, newStatus) => {
            appointmentsRepo.findById.mockResolvedValue({
              id: 1,
              status: currentStatus,
              provider_name: 'Dr. Smith',
              appointment_type: 'checkup',
              appointment_datetime: new Date('2026-07-01T10:00:00Z')
            });

            await expect(
              appointmentsService.updateStatus(1, newStatus)
            ).rejects.toMatchObject({
              type: 'conflict'
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject rescheduling terminal-status appointments', () => {
      return fc.assert(
        fc.asyncProperty(
          terminalStatus(),
          futureDate(),
          async (status, newDatetime) => {
            appointmentsRepo.findById.mockResolvedValue({
              id: 1,
              status: status,
              provider_name: 'Dr. Smith',
              appointment_type: 'checkup',
              appointment_datetime: new Date('2026-07-01T10:00:00Z')
            });

            await expect(
              appointmentsService.reschedule(1, newDatetime)
            ).rejects.toMatchObject({
              type: 'conflict'
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject updates on terminal-status appointments', () => {
      return fc.assert(
        fc.asyncProperty(
          terminalStatus(),
          futureDate(),
          async (status, newDatetime) => {
            appointmentsRepo.findById.mockResolvedValue({
              id: 1,
              status: status,
              provider_name: 'Dr. Smith',
              appointment_type: 'checkup',
              appointment_datetime: new Date('2026-07-01T10:00:00Z')
            });

            await expect(
              appointmentsService.update(1, { appointment_datetime: newDatetime })
            ).rejects.toMatchObject({
              type: 'conflict'
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // ============================================================
  // Property 8: Status update validation and persistence
  // Validates: Requirements 5.1, 5.2, 5.3
  // ============================================================
  describe('Property 8: Status update validation and persistence', () => {
    it('should reject any status not in the valid set', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(
            s => !['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(s)
          ),
          async (invalidStatus) => {
            await expect(
              appointmentsService.updateStatus(1, invalidStatus)
            ).rejects.toMatchObject({
              type: 'validation'
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept and persist any valid status on a non-terminal appointment', () => {
      const nonTerminalStatus = () => fc.constantFrom('scheduled', 'confirmed');
      const targetStatus = () => fc.constantFrom('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');

      return fc.assert(
        fc.asyncProperty(
          nonTerminalStatus(),
          targetStatus(),
          async (currentStatus, newStatus) => {
            appointmentsRepo.findById.mockResolvedValue({
              id: 1,
              status: currentStatus,
              provider_name: 'Dr. Smith',
              appointment_type: 'checkup',
              appointment_datetime: new Date('2026-07-01T10:00:00Z')
            });
            appointmentsRepo.update.mockImplementation((id, data) =>
              Promise.resolve({
                id,
                provider_name: 'Dr. Smith',
                appointment_type: 'checkup',
                appointment_datetime: new Date('2026-07-01T10:00:00Z'),
                ...data
              })
            );

            const result = await appointmentsService.updateStatus(1, newStatus);
            expect(result.status).toBe(newStatus);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
