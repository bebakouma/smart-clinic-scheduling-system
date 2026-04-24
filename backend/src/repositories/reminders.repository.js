const { prisma } = require('../config/database');

async function findAll(filters = {}) {
  const where = {};
  if (filters.appointment_id) where.appointment_id = filters.appointment_id;
  if (filters.patient_id) where.patient_id = filters.patient_id;
  return prisma.reminderLog.findMany({
    where,
    include: { appointment: true, patient: true },
    orderBy: { sent_at: 'desc' }
  });
}

async function findByAppointmentId(appointmentId) {
  return prisma.reminderLog.findMany({
    where: { appointment_id: appointmentId }
  });
}

async function create(data) {
  return prisma.reminderLog.create({ data });
}

module.exports = { findAll, findByAppointmentId, create };
