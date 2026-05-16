const appointmentsRepo = require('../repositories/appointments.repository');
const patientsRepo = require('../repositories/patients.repository');

const VALID_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];
const TERMINAL_STATUSES = ['cancelled', 'completed'];

async function getAll(filters) {
  return appointmentsRepo.findAll(filters);
}

async function getById(id) {
  const appointment = await appointmentsRepo.findById(id);
  if (!appointment) {
    const err = new Error('Appointment not found');
    err.type = 'not_found';
    throw err;
  }
  return appointment;
}

async function create(data) {
  // Validate patient exists
  const patient = await patientsRepo.findById(data.patient_id);
  if (!patient) {
    const err = new Error('Patient not found');
    err.type = 'validation';
    err.details = [{ field: 'patient_id', message: 'Patient does not exist' }];
    throw err;
  }

  // Validate future date
  if (new Date(data.appointment_datetime) <= new Date()) {
    const err = new Error('Appointment date must be in the future');
    err.type = 'validation';
    err.details = [{ field: 'appointment_datetime', message: 'Appointment date must be in the future' }];
    throw err;
  }

  // Check for provider scheduling conflict (same provider, overlapping 30-min window)
  const apptTime = new Date(data.appointment_datetime);
  const windowStart = new Date(apptTime.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(apptTime.getTime() + 30 * 60 * 1000);
  const conflict = await appointmentsRepo.findConflict(data.provider_name, windowStart, windowEnd);
  if (conflict) {
    const err = new Error('Provider has a scheduling conflict');
    err.type = 'conflict';
    throw err;
  }

  return appointmentsRepo.create({
    patient_id: data.patient_id,
    provider_name: data.provider_name,
    appointment_type: data.appointment_type,
    appointment_datetime: new Date(data.appointment_datetime),
    status: 'scheduled',
    notes: data.notes || null
  });
}

async function update(id, data) {
  const existing = await getById(id);

  if (TERMINAL_STATUSES.includes(existing.status)) {
    const err = new Error(`Cannot modify ${existing.status} appointment`);
    err.type = 'conflict';
    throw err;
  }

  if (data.appointment_datetime) {
    if (new Date(data.appointment_datetime) <= new Date()) {
      const err = new Error('Appointment date must be in the future');
      err.type = 'validation';
      err.details = [{ field: 'appointment_datetime', message: 'Appointment date must be in the future' }];
      throw err;
    }
  }

  const updateData = {};
  if (data.provider_name !== undefined) updateData.provider_name = data.provider_name;
  if (data.appointment_type !== undefined) updateData.appointment_type = data.appointment_type;
  if (data.appointment_datetime !== undefined) updateData.appointment_datetime = new Date(data.appointment_datetime);
  if (data.notes !== undefined) updateData.notes = data.notes;

  return appointmentsRepo.update(id, updateData);
}

async function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`);
    err.type = 'validation';
    err.details = [{ field: 'status', message: `Must be one of: ${VALID_STATUSES.join(', ')}` }];
    throw err;
  }

  const existing = await getById(id);

  if (TERMINAL_STATUSES.includes(existing.status)) {
    const err = new Error(`Cannot modify ${existing.status} appointment`);
    err.type = 'conflict';
    throw err;
  }

  const updated = await appointmentsRepo.update(id, { status });

  // Trigger waitlist processing on cancellation
  if (status === 'cancelled') {
    try {
      const waitlistService = require('./waitlist.service');
      await waitlistService.processCancellation(existing);
    } catch (e) {
      console.error('Waitlist processing error:', e.message);
    }
  }

  return updated;
}

async function remove(id) {
  await getById(id);
  return appointmentsRepo.remove(id);
}

module.exports = { getAll, getById, create, update, updateStatus, remove, VALID_STATUSES };
