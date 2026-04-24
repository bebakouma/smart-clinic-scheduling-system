const remindersRepo = require('../repositories/reminders.repository');
const { prisma } = require('../config/database');

async function getLogs(filters) {
  return remindersRepo.findAll(filters);
}

async function runReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find appointments within 24 hours that are not cancelled
  const appointments = await prisma.appointment.findMany({
    where: {
      appointment_datetime: { gte: now, lte: in24h },
      status: { not: 'cancelled' }
    },
    include: { patient: true, reminder_logs: true }
  });

  const results = [];

  for (const appt of appointments) {
    // Skip if already reminded
    if (appt.reminder_logs.length > 0) continue;

    const contactMethod = appt.patient.preferred_contact_method || 'email';
    const message = `Reminder: You have a ${appt.appointment_type} appointment on ${appt.appointment_datetime.toISOString()} with ${appt.provider_name}.`;

    const log = await remindersRepo.create({
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      reminder_type: contactMethod,
      status: 'sent',
      message
    });

    results.push(log);
  }

  return results;
}

module.exports = { getLogs, runReminders };
