const intakeRepo = require('../repositories/intake.repository');
const appointmentsRepo = require('../repositories/appointments.repository');

async function getByAppointmentId(appointmentId) {
  const form = await intakeRepo.findByAppointmentId(appointmentId);
  if (!form) {
    const err = new Error('Intake form not found');
    err.type = 'not_found';
    throw err;
  }
  return form;
}

async function create(data) {
  // Validate appointment exists
  const appointment = await appointmentsRepo.findById(data.appointment_id);
  if (!appointment) {
    const err = new Error('Appointment not found');
    err.type = 'validation';
    err.details = [{ field: 'appointment_id', message: 'Appointment does not exist' }];
    throw err;
  }

  return intakeRepo.create({
    patient_id: appointment.patient_id,
    appointment_id: data.appointment_id,
    reason_for_visit: data.reason_for_visit,
    insurance_provider: data.insurance_provider || null,
    insurance_member_id: data.insurance_member_id || null,
    allergies: data.allergies || null,
    medications: data.medications || null,
    emergency_contact_name: data.emergency_contact_name || null,
    emergency_contact_phone: data.emergency_contact_phone || null,
    notes: data.notes || null
  });
}

async function update(id, data) {
  const existing = await intakeRepo.findById(id);
  if (!existing) {
    const err = new Error('Intake form not found');
    err.type = 'not_found';
    throw err;
  }

  const updateData = {};
  if (data.reason_for_visit !== undefined) updateData.reason_for_visit = data.reason_for_visit;
  if (data.insurance_provider !== undefined) updateData.insurance_provider = data.insurance_provider;
  if (data.insurance_member_id !== undefined) updateData.insurance_member_id = data.insurance_member_id;
  if (data.allergies !== undefined) updateData.allergies = data.allergies;
  if (data.medications !== undefined) updateData.medications = data.medications;
  if (data.emergency_contact_name !== undefined) updateData.emergency_contact_name = data.emergency_contact_name;
  if (data.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = data.emergency_contact_phone;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return intakeRepo.update(id, updateData);
}

module.exports = { getByAppointmentId, create, update };
