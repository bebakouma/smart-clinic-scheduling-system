const { prisma } = require('../config/database');

async function findByAppointmentId(appointmentId) {
  return prisma.intakeForm.findUnique({
    where: { appointment_id: appointmentId },
    include: { patient: true, appointment: true }
  });
}

async function findById(id) {
  return prisma.intakeForm.findUnique({
    where: { id },
    include: { patient: true, appointment: true }
  });
}

async function create(data) {
  return prisma.intakeForm.create({
    data,
    include: { patient: true, appointment: true }
  });
}

async function update(id, data) {
  return prisma.intakeForm.update({
    where: { id },
    data,
    include: { patient: true, appointment: true }
  });
}

module.exports = { findByAppointmentId, findById, create, update };
