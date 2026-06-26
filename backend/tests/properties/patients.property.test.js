const fc = require('fast-check');
const patientsService = require('../../src/services/patients.service');
const patientsRepo = require('../../src/repositories/patients.repository');

jest.mock('../../src/repositories/patients.repository');

describe('Patients Service - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Arbitrary: generates a valid patient name (non-empty alpha string)
  const validName = () => fc.stringMatching(/^[A-Za-z]{1,30}$/);

  // Arbitrary: generates a valid date of birth (past date, at least 1 year old)
  const validDob = () =>
    fc.date({
      min: new Date('1920-01-01'),
      max: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    }).map(d => d.toISOString().split('T')[0]);

  // Arbitrary: generates an optional phone number
  const optionalPhone = () =>
    fc.option(fc.stringMatching(/^[0-9]{10}$/), { nil: null });

  // Arbitrary: generates an optional email
  const optionalEmail = () =>
    fc.option(
      fc.stringMatching(/^[a-z]{3,10}@[a-z]{3,8}\.[a-z]{2,4}$/),
      { nil: null }
    );

  // Arbitrary: generates a preferred contact method
  const contactMethod = () => fc.constantFrom('email', 'phone', 'sms');

  // ============================================================
  // Property 1: Patient creation round-trip
  // Validates: Requirements 1.1, 1.3
  // ============================================================
  describe('Property 1: Patient creation round-trip', () => {
    it('should persist all provided fields and return them unchanged', () => {
      return fc.assert(
        fc.asyncProperty(
          validName(),
          validName(),
          validDob(),
          optionalPhone(),
          optionalEmail(),
          contactMethod(),
          async (firstName, lastName, dob, phone, email, contactPref) => {
            const inputData = {
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dob,
              phone: phone,
              email: email,
              preferred_contact_method: contactPref
            };

            patientsRepo.create.mockImplementation(data =>
              Promise.resolve({ id: 1, ...data, created_at: new Date(), updated_at: new Date() })
            );

            const result = await patientsService.create(inputData);

            // Verify all fields are preserved
            expect(result.first_name).toBe(firstName);
            expect(result.last_name).toBe(lastName);
            expect(result.date_of_birth).toEqual(new Date(dob));
            expect(result.phone).toBe(phone);
            expect(result.email).toBe(email);
            expect(result.preferred_contact_method).toBe(contactPref);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should default preferred_contact_method to "email" when not provided', () => {
      return fc.assert(
        fc.asyncProperty(
          validName(),
          validName(),
          validDob(),
          async (firstName, lastName, dob) => {
            patientsRepo.create.mockImplementation(data =>
              Promise.resolve({ id: 1, ...data, created_at: new Date(), updated_at: new Date() })
            );

            const result = await patientsService.create({
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dob
            });

            expect(result.preferred_contact_method).toBe('email');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================
  // Property 2: Patient required field validation
  // Validates: Requirement 1.6
  // ============================================================
  describe('Property 2: Patient required field validation (Joi)', () => {
    const { createSchema } = require('../../src/validators/patients.validator');

    it('should always reject when first_name is missing or empty', () => {
      return fc.assert(
        fc.property(
          fc.constantFrom(undefined, null, ''),
          validName(),
          validDob(),
          (firstName, lastName, dob) => {
            const input = { first_name: firstName, last_name: lastName, date_of_birth: dob };
            const { error } = createSchema.validate(input);
            expect(error).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should always reject when last_name is missing or empty', () => {
      return fc.assert(
        fc.property(
          validName(),
          fc.constantFrom(undefined, null, ''),
          validDob(),
          (firstName, lastName, dob) => {
            const input = { first_name: firstName, last_name: lastName, date_of_birth: dob };
            const { error } = createSchema.validate(input);
            expect(error).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should always reject when date_of_birth is missing', () => {
      return fc.assert(
        fc.property(
          validName(),
          validName(),
          (firstName, lastName) => {
            const input = { first_name: firstName, last_name: lastName };
            const { error } = createSchema.validate(input);
            expect(error).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should always accept valid complete patient data', () => {
      return fc.assert(
        fc.property(
          validName(),
          validName(),
          validDob(),
          contactMethod(),
          (firstName, lastName, dob, method) => {
            const input = {
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dob,
              preferred_contact_method: method
            };
            const { error } = createSchema.validate(input);
            expect(error).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject invalid preferred_contact_method values', () => {
      return fc.assert(
        fc.property(
          validName(),
          validName(),
          validDob(),
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !['email', 'phone', 'sms'].includes(s)
          ),
          (firstName, lastName, dob, badMethod) => {
            const input = {
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dob,
              preferred_contact_method: badMethod
            };
            const { error } = createSchema.validate(input);
            expect(error).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
