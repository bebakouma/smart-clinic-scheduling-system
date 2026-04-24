const waitlistRepo = require('../repositories/waitlist.repository');

async function getAll() {
  return waitlistRepo.findAll();
}

async function getById(id) {
  const entry = await waitlistRepo.findById(id);
  if (!entry) {
    const err = new Error('Waitlist entry not found');
    err.type = 'not_found';
    throw err;
  }
  return entry;
}

async function create(data) {
  return waitlistRepo.create({
    patient_id: data.patient_id,
    requested_appointment_type: data.requested_appointment_type,
    preferred_date: data.preferred_date ? new Date(data.preferred_date) : null,
    preferred_time_range: data.preferred_time_range || null,
    status: 'waiting'
  });
}

async function updateStatus(id, status) {
  await getById(id);
  const updateData = { status };
  if (status === 'notified') {
    updateData.notified_at = new Date();
  }
  return waitlistRepo.update(id, updateData);
}

async function processCancellation(appointment) {
  const matches = await waitlistRepo.findMatchingEntries(
    appointment.appointment_type,
    appointment.appointment_datetime
  );

  if (matches.length === 0) return null;

  // Notify the first (oldest) matching entry
  const first = matches[0];
  return waitlistRepo.update(first.id, {
    status: 'notified',
    notified_at: new Date()
  });
}

module.exports = { getAll, getById, create, updateStatus, processCancellation };
