const patientsRepo = require('../repositories/patients.repository');

async function getAll(search = null) {
  return patientsRepo.findAll(search);
}

async function getById(id) {
  const patient = await patientsRepo.findById(id);
  if (!patient) {
    const err = new Error('Patient not found');
    err.type = 'not_found';
    throw err;
  }
  return patient;
}

async function create(data) {
  return patientsRepo.create({
    first_name: data.first_name,
    last_name: data.last_name,
    date_of_birth: new Date(data.date_of_birth),
    phone: data.phone || null,
    email: data.email || null,
    preferred_contact_method: data.preferred_contact_method || 'email'
  });
}

async function update(id, data) {
  await getById(id);
  const updateData = {};
  if (data.first_name !== undefined) updateData.first_name = data.first_name;
  if (data.last_name !== undefined) updateData.last_name = data.last_name;
  if (data.date_of_birth !== undefined) updateData.date_of_birth = new Date(data.date_of_birth);
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.preferred_contact_method !== undefined) updateData.preferred_contact_method = data.preferred_contact_method;
  return patientsRepo.update(id, updateData);
}

async function remove(id) {
  await getById(id);
  return patientsRepo.remove(id);
}

module.exports = { getAll, getById, create, update, remove };
