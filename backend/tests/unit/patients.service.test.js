const patientsService = require('../../src/services/patients.service');
const patientsRepo = require('../../src/repositories/patients.repository');

jest.mock('../../src/repositories/patients.repository');

describe('Patients Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a patient with all required fields', async () => {
      const inputData = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-05-15',
        phone: '5551234567',
        email: 'john@example.com',
        preferred_contact_method: 'phone'
      };

      patientsRepo.create.mockImplementation(data =>
        Promise.resolve({ id: 1, ...data, created_at: new Date(), updated_at: new Date() })
      );

      const result = await patientsService.create(inputData);

      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.date_of_birth).toEqual(new Date('1990-05-15'));
      expect(result.phone).toBe('5551234567');
      expect(result.email).toBe('john@example.com');
      expect(result.preferred_contact_method).toBe('phone');
    });

    it('should default preferred_contact_method to email', async () => {
      patientsRepo.create.mockImplementation(data =>
        Promise.resolve({ id: 1, ...data, created_at: new Date(), updated_at: new Date() })
      );

      const result = await patientsService.create({
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-03-20'
      });

      expect(result.preferred_contact_method).toBe('email');
    });

    it('should set phone and email to null when not provided', async () => {
      patientsRepo.create.mockImplementation(data =>
        Promise.resolve({ id: 1, ...data, created_at: new Date(), updated_at: new Date() })
      );

      const result = await patientsService.create({
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-03-20'
      });

      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return patient when found', async () => {
      const mockPatient = { id: 1, first_name: 'John', last_name: 'Doe' };
      patientsRepo.findById.mockResolvedValue(mockPatient);

      const result = await patientsService.getById(1);
      expect(result).toEqual(mockPatient);
    });

    it('should throw not_found error when patient does not exist', async () => {
      patientsRepo.findById.mockResolvedValue(null);

      await expect(patientsService.getById(999)).rejects.toMatchObject({
        message: 'Patient not found',
        type: 'not_found'
      });
    });
  });

  describe('update', () => {
    it('should update only provided fields', async () => {
      patientsRepo.findById.mockResolvedValue({ id: 1, first_name: 'John', last_name: 'Doe' });
      patientsRepo.update.mockImplementation((id, data) =>
        Promise.resolve({ id, first_name: 'John', last_name: 'Doe', ...data })
      );

      const result = await patientsService.update(1, { phone: '5559999999' });

      expect(patientsRepo.update).toHaveBeenCalledWith(1, { phone: '5559999999' });
      expect(result.phone).toBe('5559999999');
    });

    it('should throw not_found if patient does not exist', async () => {
      patientsRepo.findById.mockResolvedValue(null);

      await expect(
        patientsService.update(999, { first_name: 'Updated' })
      ).rejects.toMatchObject({
        type: 'not_found'
      });
    });

    it('should convert date_of_birth string to Date object', async () => {
      patientsRepo.findById.mockResolvedValue({ id: 1 });
      patientsRepo.update.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      await patientsService.update(1, { date_of_birth: '2000-01-01' });

      expect(patientsRepo.update).toHaveBeenCalledWith(1, {
        date_of_birth: new Date('2000-01-01')
      });
    });
  });

  describe('remove', () => {
    it('should delete patient when found', async () => {
      patientsRepo.findById.mockResolvedValue({ id: 1 });
      patientsRepo.remove.mockResolvedValue({ id: 1 });

      const result = await patientsService.remove(1);
      expect(patientsRepo.remove).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
    });

    it('should throw not_found if patient does not exist', async () => {
      patientsRepo.findById.mockResolvedValue(null);

      await expect(patientsService.remove(999)).rejects.toMatchObject({
        type: 'not_found'
      });
    });
  });
});
