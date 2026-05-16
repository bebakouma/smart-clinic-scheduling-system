const { prisma } = require('../config/database');

async function findAll(search = null) {
  const where = {};
  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }
  return prisma.patient.findMany({ where, orderBy: { created_at: 'desc' } });
}

async function findById(id) {
  return prisma.patient.findUnique({ where: { id } });
}

async function create(data) {
  return prisma.patient.create({ data });
}

async function update(id, data) {
  return prisma.patient.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.patient.delete({ where: { id } });
}

module.exports = { findAll, findById, create, update, remove };
