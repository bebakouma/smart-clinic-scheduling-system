const fc = require('fast-check');
const intakeService = require('../../src/services/intake.service');
const intakeRepo = require('../../src/repositories/intake.repository');
const appointmentsRepo = require('../../src/repositories/appointments.repository');

jest.mock('../../src/repositories/intake.repository');
jest.mock('../../src/repositories/appointments.repository');

describe('Intake Service - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const nonEmptyText = () => fc.string({ minLength: 1, maxLength: 60 }).filter(s => s.trim().length > 0);
  // Optional fields: use non-empty strings or null. The service normalizes
  // empty strings to null (data.field || null), so we test with values that
  // round-trip unchanged.
  const optionalText = () =>
    fc.option(fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.length > 0), { nil: null });

  // ============================================================
  // Property 13: Intake form round-trip
  // Validates: Requirements 8.1, 8.2
  // Creating an intake form for an existing appointment persists all
  // submitted fields, and fetching it back returns the same values.
  // ============================================================
  describe('Property 13: Intake form round-trip', () => {
    it('should persist all submitted fields and return them unchanged', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // appointment_id
          fc.integer({ min: 1, max: 10000 }), // patient_id (from appointment)
          nonEmptyText(),                      // reason_for_visit
          optionalText(),                      // insurance_provider
          optionalText(),                      // allergies
          optionalText(),                      // medications
          async (appointmentId, patientId, reason, insurance, allergies, medications) => {
            // Appointment exists and owns patientId
            appointmentsRepo.findById.mockResolvedValue({
              id: appointmentId,
              patient_id: patientId
            });

            // Repo stores and returns what it was given (round-trip)
            const store = {};
            intakeRepo.create.mockImplementation(data => {
              store[data.appointment_id] = { id: 1, ...data };
              return Promise.resolve(store[data.appointment_id]);
            });
            intakeRepo.findByAppointmentId.mockImplementation(aid =>
              Promise.resolve(store[aid] || null)
            );

            const input = {
              appointment_id: appointmentId,
              reason_for_visit: reason,
              insurance_provider: insurance,
              allergies: allergies,
              medications: medications
            };

            const created = await intakeService.create(input);
            const fetched = await intakeService.getByAppointmentId(appointmentId);

            // Round-trip: created equals fetched, and fields match input
            expect(fetched).toEqual(created);
            expect(fetched.appointment_id).toBe(appointmentId);
            expect(fetched.patient_id).toBe(patientId);
            expect(fetched.reason_for_visit).toBe(reason);
            expect(fetched.insurance_provider).toBe(insurance);
            expect(fetched.allergies).toBe(allergies);
            expect(fetched.medications).toBe(medications);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject intake creation when the appointment does not exist', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          nonEmptyText(),
          async (appointmentId, reason) => {
            appointmentsRepo.findById.mockResolvedValue(null);

            await expect(
              intakeService.create({ appointment_id: appointmentId, reason_for_visit: reason })
            ).rejects.toMatchObject({ type: 'validation' });
            expect(intakeRepo.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
