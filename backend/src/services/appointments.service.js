const appointmentsRepo = require('../repositories/appointments.repository');
const patientsRepo = require('../repositories/patients.repository');
const { generateConfirmationCode, normalizeConfirmationCode } = require('../utils/confirmationCode');

const VALID_STATUSES = ['scheduled', 'confirmed', 'checked_in', 'cancelled', 'completed', 'no_show'];
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
    confirmation_code: await createUniqueConfirmationCode(),
    notes: data.notes || null
  });
}

// Generate a confirmation code that is not already used. Collisions are
// extremely unlikely (1.1 trillion combinations) but the column is unique, so
// we check and retry rather than fail an appointment booking.
async function createUniqueConfirmationCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateConfirmationCode();
    const existing = await appointmentsRepo.findByConfirmationCode(code);
    if (!existing) return code;
  }
  const err = new Error('Could not generate a unique confirmation code');
  err.type = 'conflict';
  throw err;
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

async function confirm(id) {
  const existing = await getById(id);

  if (TERMINAL_STATUSES.includes(existing.status)) {
    const err = new Error(`Cannot confirm ${existing.status} appointment`);
    err.type = 'conflict';
    throw err;
  }

  return appointmentsRepo.update(id, {
    confirmation_status: 'confirmed',
    status: 'confirmed'
  });
}

async function reschedule(id, newDatetime, reason) {
  const existing = await getById(id);

  if (TERMINAL_STATUSES.includes(existing.status)) {
    const err = new Error(`Cannot reschedule ${existing.status} appointment`);
    err.type = 'conflict';
    throw err;
  }

  // Validate future date
  if (new Date(newDatetime) <= new Date()) {
    const err = new Error('New appointment date must be in the future');
    err.type = 'validation';
    err.details = [{ field: 'appointment_datetime', message: 'Must be a future date' }];
    throw err;
  }

  // Check for provider conflict at new time
  const apptTime = new Date(newDatetime);
  const windowStart = new Date(apptTime.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(apptTime.getTime() + 30 * 60 * 1000);
  const conflict = await appointmentsRepo.findConflict(existing.provider_name, windowStart, windowEnd, id);
  if (conflict) {
    const err = new Error('Provider has a scheduling conflict at the new time');
    err.type = 'conflict';
    throw err;
  }

  const updateData = {
    appointment_datetime: new Date(newDatetime),
    status: 'scheduled',
    notes: reason
      ? `${existing.notes ? existing.notes + ' | ' : ''}Rescheduled: ${reason}`
      : existing.notes
  };

  return appointmentsRepo.update(id, updateData);
}

async function remove(id) {
  await getById(id);
  return appointmentsRepo.remove(id);
}

/**
 * Check a patient in for their appointment.
 *
 * Lookup is by appointment id or by confirmation code (one is required).
 * Check-in rules:
 *   - the appointment must exist
 *   - it must not be in a terminal state (cancelled / completed / no_show)
 *   - checking in again is rejected (already checked in)
 *
 * On success the appointment is marked checked_in with a checked_in_at
 * timestamp. This is the backend the staff action and the future kiosk / IoT
 * device both call.
 *
 * @param {object} params
 * @param {number} [params.appointmentId]
 * @param {string} [params.confirmationCode]
 */
async function checkIn({ appointmentId, confirmationCode } = {}) {
  if (!appointmentId && !confirmationCode) {
    const err = new Error('An appointment id or confirmation code is required');
    err.type = 'validation';
    err.details = [{ field: 'appointment', message: 'Provide appointmentId or confirmationCode' }];
    throw err;
  }

  const appointment = appointmentId
    ? await appointmentsRepo.findById(appointmentId)
    : await appointmentsRepo.findByConfirmationCode(confirmationCode);

  if (!appointment) {
    const err = new Error('Appointment not found');
    err.type = 'not_found';
    throw err;
  }

  return applyCheckIn(appointment);
}

// Check-in rules, shared by staff check-in and kiosk check-in.
function assertCanCheckIn(appointment) {
  // Cannot check in to a cancelled, completed, or no-show appointment.
  if (TERMINAL_STATUSES.includes(appointment.status) || appointment.status === 'no_show') {
    const err = new Error(`Cannot check in a ${appointment.status} appointment`);
    err.type = 'conflict';
    throw err;
  }

  // Already checked in -> reject (no duplicate side effects).
  if (appointment.checked_in) {
    const err = new Error('Appointment is already checked in');
    err.type = 'conflict';
    throw err;
  }
}

async function applyCheckIn(appointment) {
  assertCanCheckIn(appointment);
  return appointmentsRepo.update(appointment.id, {
    checked_in: true,
    checked_in_at: new Date(),
    status: 'checked_in'
  });
}

// ── Kiosk (patient self check-in) ─────────────────────────────────────────

// The kiosk has no staff login, so identity is confirmed with two things the
// patient knows: the confirmation code and their date of birth.
// A wrong code and a wrong date of birth produce the SAME error, so the kiosk
// cannot be used to find out which codes exist.
function kioskNoMatch() {
  const err = new Error('We could not find a matching appointment. Please see the front desk.');
  err.type = 'not_found';
  return err;
}

function toDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

async function verifyKioskIdentity({ confirmationCode, dateOfBirth }) {
  const code = normalizeConfirmationCode(confirmationCode);
  if (!code || !dateOfBirth) throw kioskNoMatch();

  const appointment = await appointmentsRepo.findByConfirmationCode(code);
  const patient = appointment && appointment.patient;
  if (!patient || !patient.date_of_birth || toDateOnly(patient.date_of_birth) !== dateOfBirth) {
    throw kioskNoMatch();
  }
  return appointment;
}

// Only what the patient needs to confirm it is their appointment.
// Never return the full record (no phone, email, date of birth, notes).
function kioskView(appointment) {
  return {
    first_name: appointment.patient.first_name,
    appointment_datetime: appointment.appointment_datetime
  };
}

/**
 * Step 1 of kiosk check-in: verify the patient and show the appointment so
 * they can confirm it. Does not change anything.
 */
async function kioskLookup({ confirmationCode, dateOfBirth }) {
  const appointment = await verifyKioskIdentity({ confirmationCode, dateOfBirth });
  assertCanCheckIn(appointment);
  return kioskView(appointment);
}

/**
 * Step 2: check the patient in. Identity is verified again here, so the
 * server never trusts that the lookup step happened.
 */
async function kioskCheckIn({ confirmationCode, dateOfBirth }) {
  const appointment = await verifyKioskIdentity({ confirmationCode, dateOfBirth });
  await applyCheckIn(appointment);
  return kioskView(appointment);
}

module.exports = {
  getAll, getById, create, update, updateStatus, confirm, reschedule, remove,
  checkIn, kioskLookup, kioskCheckIn, VALID_STATUSES
};
