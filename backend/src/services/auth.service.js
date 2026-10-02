const bcrypt = require('bcryptjs');
const usersRepo = require('../repositories/users.repository');
const { generateToken } = require('../middleware/auth');

const VALID_ROLES = ['admin', 'staff', 'provider', 'readonly'];
const SALT_ROUNDS = 10;

async function register(data) {
  const existing = await usersRepo.findByEmail(data.email);
  if (existing) {
    const err = new Error('Email is already registered');
    err.type = 'conflict';
    throw err;
  }

  const role = data.role || 'staff';
  if (!VALID_ROLES.includes(role)) {
    const err = new Error(`Invalid role. Allowed values: ${VALID_ROLES.join(', ')}`);
    err.type = 'validation';
    err.details = [{ field: 'role', message: `Must be one of: ${VALID_ROLES.join(', ')}` }];
    throw err;
  }

  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await usersRepo.create({
    email: data.email,
    password_hash,
    role,
    name: data.name
  });

  return sanitize(user);
}

async function login(email, password) {
  const user = await usersRepo.findByEmail(email);
  if (!user) {
    throw invalidCredentials();
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw invalidCredentials();
  }

  const token = generateToken({ id: user.id, role: user.role, name: user.name });
  return { token, user: sanitize(user) };
}

function sanitize(user) {
  // Never expose the password hash
  const { password_hash, ...safe } = user;
  return safe;
}

function invalidCredentials() {
  const err = new Error('Invalid email or password');
  err.type = 'unauthorized';
  return err;
}

module.exports = { register, login, VALID_ROLES };
