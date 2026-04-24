import React, { useState, useEffect } from 'react';
import { patientService } from '../services/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', preferred_contact_method: 'email' });
  const [error, setError] = useState('');

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (err) { console.error(err); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '', preferred_contact_method: 'email' });
    setShowForm(true);
    setError('');
  }

  function openEdit(patient) {
    setEditing(patient);
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth?.split('T')[0] || '',
      phone: patient.phone || '',
      email: patient.email || '',
      preferred_contact_method: patient.preferred_contact_method || 'email'
    });
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await patientService.update(editing.id, form);
      } else {
        await patientService.create(form);
      }
      setShowForm(false);
      loadPatients();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this patient?')) return;
    try {
      await patientService.remove(id);
      loadPatients();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Patients</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add Patient</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Patient' : 'New Patient'}</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="first_name">First Name *</label>
              <input id="first_name" className="w-full border rounded px-3 py-2" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="last_name">Last Name *</label>
              <input id="last_name" className="w-full border rounded px-3 py-2" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="dob">Date of Birth *</label>
              <input id="dob" type="date" className="w-full border rounded px-3 py-2" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="phone">Phone</label>
              <input id="phone" className="w-full border rounded px-3 py-2" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
              <input id="email" type="email" className="w-full border rounded px-3 py-2" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="contact_method">Preferred Contact</label>
              <select id="contact_method" className="w-full border rounded px-3 py-2" value={form.preferred_contact_method} onChange={e => setForm({...form, preferred_contact_method: e.target.value})}>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">DOB</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Contact Pref</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.first_name} {p.last_name}</td>
                <td className="px-4 py-3">{new Date(p.date_of_birth).toLocaleDateString()}</td>
                <td className="px-4 py-3">{p.phone || '-'}</td>
                <td className="px-4 py-3">{p.email || '-'}</td>
                <td className="px-4 py-3">{p.preferred_contact_method}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
