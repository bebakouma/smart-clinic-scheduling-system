const { prisma } = require('../config/database');

async function findAll(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.startDate && filters.endDate) {
    where.appointment_datetime = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate)
    };
  }
  return prisma.appointment.findMany({
    where,
    include: { patient: true },
    orderBy: { appointment_datetime: 'asc' }
  });
}

async function findById(id) {
  return prisma.appointment.findUnique({
    where: { id },
    include: { patient: true }
  });
}

async function create(data) {
  return prisma.appointment.create({
    data,
    include: { patient: true }
  });
}

async function update(id, data) {
  return prisma.appointment.update({
    where: { id },
    data,
    include: { patient: true }
  });
}

async function remove(id) {
  return prisma.appointment.delete({ where: { id } });
}

module.exports = { findAll, findById, create, update, remove };
