const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../../src/services/auth.service');
const usersRepo = require('../../src/repositories/users.repository');
const { JWT_SECRET } = require('../../src/middleware/auth');

jest.mock('../../src/repositories/users.repository');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should hash the password and never store it in plain text', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);
      usersRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

      await authService.register({
        email: 'jane@clinic.com',
        password: 'supersecret',
        name: 'Jane'
      });

      const stored = usersRepo.create.mock.calls[0][0];
      expect(stored.password_hash).toBeDefined();
      expect(stored.password_hash).not.toBe('supersecret');
      // The stored hash should verify against the original password
      const matches = await bcrypt.compare('supersecret', stored.password_hash);
      expect(matches).toBe(true);
    });

    it('should default role to "staff" when not provided', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);
      usersRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

      await authService.register({ email: 'a@b.com', password: 'password1', name: 'A' });

      expect(usersRepo.create.mock.calls[0][0].role).toBe('staff');
    });

    it('should not return the password hash in the result', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);
      usersRepo.create.mockImplementation(data => Promise.resolve({ id: 1, ...data }));

      const result = await authService.register({
        email: 'a@b.com',
        password: 'password1',
        name: 'A'
      });

      expect(result.password_hash).toBeUndefined();
      expect(result.email).toBe('a@b.com');
    });

    it('should reject registration when the email already exists', async () => {
      usersRepo.findByEmail.mockResolvedValue({ id: 1, email: 'a@b.com' });

      await expect(
        authService.register({ email: 'a@b.com', password: 'password1', name: 'A' })
      ).rejects.toMatchObject({ type: 'conflict' });
      expect(usersRepo.create).not.toHaveBeenCalled();
    });

    it('should reject an invalid role', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.register({ email: 'a@b.com', password: 'password1', name: 'A', role: 'superuser' })
      ).rejects.toMatchObject({ type: 'validation' });
    });
  });

  describe('login', () => {
    it('should return a valid JWT and user on correct credentials', async () => {
      const password_hash = await bcrypt.hash('password1', 10);
      usersRepo.findByEmail.mockResolvedValue({
        id: 7,
        email: 'a@b.com',
        password_hash,
        role: 'staff',
        name: 'A'
      });

      const result = await authService.login('a@b.com', 'password1');

      expect(result.token).toBeDefined();
      const decoded = jwt.verify(result.token, JWT_SECRET);
      expect(decoded.sub).toBe(7);
      expect(decoded.role).toBe('staff');
      expect(result.user.password_hash).toBeUndefined();
    });

    it('should reject login with wrong password', async () => {
      const password_hash = await bcrypt.hash('correct', 10);
      usersRepo.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password_hash,
        role: 'staff',
        name: 'A'
      });

      await expect(authService.login('a@b.com', 'wrong')).rejects.toMatchObject({
        type: 'unauthorized'
      });
    });

    it('should reject login for a non-existent user', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login('nobody@b.com', 'password1')).rejects.toMatchObject({
        type: 'unauthorized'
      });
    });
  });
});
