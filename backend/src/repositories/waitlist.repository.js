const { prisma } = require('../config/database');

async function findAll() {
  return prisma.waitlistEntry.findMany({
    include: { patient: true },
    orderBy: { created_at: 'asc' }
  });
}

async function findById(id) {
  return prisma.waitlistEntry.findUnique({
    where: { id },
    include: { patient: true }
  });
}

async function create(data) {
  return prisma.waitlistEntry.create({
    data,
    include: { patient: true }
  });
}

async function update(id, data) {
  return prisma.waitlistEntry.update({
    where: { id },
    data,
    include: { patient: true }
  });
}

async function findMatchingEntries(appointmentType, preferredDate) {
  const where = {
    status: 'waiting',
    requested_appointment_type: appointmentType
  };
  if (preferredDate) {
    const dayStart = new Date(preferredDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(preferredDate);
    dayEnd.setHours(23, 59, 59, 999);
    where.preferred_date = { gte: dayStart, lte: dayEnd };
  }
  return prisma.waitlistEntry.findMany({
    where,
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }]
  });
}

module.exports = { findAll, findById, create, update, findMatchingEntries };
