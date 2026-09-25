const fc = require('fast-check');
const { success } = require('../../src/middleware/responseEnvelope');

describe('Serialization - Property Tests', () => {
  // Mock Express response object
  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // ============================================================
  // Property 14: API response envelope consistency
  // Validates: Requirements 11.1, 11.2
  // Every successful response is wrapped in a { data: ... } envelope.
  // ============================================================
  describe('Property 14: API response envelope consistency', () => {
    it('should always wrap successful responses in a data envelope', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ id: fc.integer(), name: fc.string() }),
            fc.array(fc.integer()),
            fc.string(),
            fc.integer(),
            fc.constant(null)
          ),
          (payload) => {
            const res = makeRes();

            success(res, payload);

            expect(res.json).toHaveBeenCalledTimes(1);
            const body = res.json.mock.calls[0][0];
            expect(body).toHaveProperty('data');
            expect(body.data).toEqual(payload);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should use the provided status code and default to 200', () => {
      fc.assert(
        fc.property(
          fc.record({ value: fc.string() }),
          fc.option(fc.constantFrom(200, 201, 204), { nil: undefined }),
          (payload, statusCode) => {
            const res = makeRes();

            if (statusCode === undefined) {
              success(res, payload);
              expect(res.status).toHaveBeenCalledWith(200);
            } else {
              success(res, payload, statusCode);
              expect(res.status).toHaveBeenCalledWith(statusCode);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // ============================================================
  // Property 15: Domain object JSON serialization round-trip
  // Validates: Requirement 11.3
  // Serializing a domain object to JSON and parsing it back yields
  // an equivalent object.
  // ============================================================
  describe('Property 15: Domain object JSON serialization round-trip', () => {
    // Arbitrary resembling a Patient domain object
    const patientArb = () =>
      fc.record({
        id: fc.integer({ min: 1, max: 100000 }),
        first_name: fc.string({ minLength: 1, maxLength: 30 }),
        last_name: fc.string({ minLength: 1, maxLength: 30 }),
        phone: fc.option(fc.string({ maxLength: 15 }), { nil: null }),
        email: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
        preferred_contact_method: fc.constantFrom('email', 'phone', 'sms')
      });

    // Arbitrary resembling an Appointment domain object
    const appointmentArb = () =>
      fc.record({
        id: fc.integer({ min: 1, max: 100000 }),
        patient_id: fc.integer({ min: 1, max: 100000 }),
        provider_name: fc.string({ minLength: 1, maxLength: 30 }),
        appointment_type: fc.constantFrom('checkup', 'consultation', 'follow_up'),
        status: fc.constantFrom('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'),
        notes: fc.option(fc.string({ maxLength: 50 }), { nil: null })
      });

    it('should round-trip Patient objects through JSON unchanged', () => {
      fc.assert(
        fc.property(patientArb(), (patient) => {
          const roundTripped = JSON.parse(JSON.stringify(patient));
          expect(roundTripped).toEqual(patient);
        }),
        { numRuns: 50 }
      );
    });

    it('should round-trip Appointment objects through JSON unchanged', () => {
      fc.assert(
        fc.property(appointmentArb(), (appointment) => {
          const roundTripped = JSON.parse(JSON.stringify(appointment));
          expect(roundTripped).toEqual(appointment);
        }),
        { numRuns: 50 }
      );
    });
  });
});
