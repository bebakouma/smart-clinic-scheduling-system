const { prisma } = require('../config/database');

async function findAll() {
  return prisma.patient.findMany({ orderBy: { created_at: 'desc' } });
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
