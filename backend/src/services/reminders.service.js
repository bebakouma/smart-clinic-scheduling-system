const remindersRepo = require('../repositories/reminders.repository');
const notificationService = require('./notifications/notification.service');
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

    // Deliver through the notification service abstraction. In dev/test this is
    // the console provider (logs only); in production it is SendGrid/Twilio.
    // We record the provider's returned status so the log reflects reality.
    const recipient = contactMethod === 'sms' ? appt.patient.phone : appt.patient.email;
    const delivery = await notificationService.send({
      channel: contactMethod === 'sms' ? 'sms' : 'email',
      to: recipient,
      subject: 'Appointment reminder',
      text: message
    });

    const log = await remindersRepo.create({
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      reminder_type: contactMethod,
      status: delivery.status, // 'sent' | 'failed' from the provider
      message
    });

    results.push(log);
  }

  return results;
}

module.exports = { getLogs, runReminders };
