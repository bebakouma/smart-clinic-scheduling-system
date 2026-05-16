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

async function findConflict(providerName, windowStart, windowEnd, excludeId = null) {
  const where = {
    provider_name: providerName,
    status: { notIn: ['cancelled'] },
    appointment_datetime: { gte: windowStart, lte: windowEnd }
  };
  if (excludeId) where.id = { not: excludeId };
  return prisma.appointment.findFirst({ where });
}

module.exports = { findAll, findById, create, update, remove, findConflict };
