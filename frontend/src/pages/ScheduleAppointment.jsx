import React, { useState, useEffect } from 'react';
import { appointmentService, patientService } from '../services/api';

const STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];

export default function ScheduleAppointment() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '', provider_name: '', appointment_type: '', appointment_datetime: '', notes: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [filterStatus]);

  async function load() {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const [appts, pats] = await Promise.all([
        appointmentService.getAll(params),
        patientService.getAll()
      ]);
      setAppointments(appts);
      setPatients(pats);
    } catch (err) { console.error(err); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await appointmentService.create({ ...form, patient_id: parseInt(form.patient_id) });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleStatusChange(id, status) {
    try {
      await appointmentService.updateStatus(id, status);
      load();
    } catch (err) { alert(err.message); }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    await handleStatusChange(id, 'cancelled');
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <button onClick={() => { setShowForm(true); setError(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">New Appointment</button>
      </div>

      <div className="mb-4">
        <label htmlFor="statusFilter" className="text-sm font-medium mr-2">Filter by status:</label>
        <select id="statusFilter" className="border rounded px-3 py-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Schedule Appointment</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="patient_id">Patient *</label>
              <select id="patient_id" className="w-full border rounded px-3 py-2" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="provider">Provider *</label>
              <input id="provider" className="w-full border rounded px-3 py-2" value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="appt_type">Type *</label>
              <input id="appt_type" className="w-full border rounded px-3 py-2" value={form.appointment_type} onChange={e => setForm({...form, appointment_type: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="appt_datetime">Date/Time *</label>
              <input id="appt_datetime" type="datetime-local" className="w-full border rounded px-3 py-2" value={form.appointment_datetime} onChange={e => setForm({...form, appointment_datetime: e.target.value})} required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" htmlFor="notes">Notes</label>
              <textarea id="notes" className="w-full border rounded px-3 py-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Schedule</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Date/Time</th>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Provider</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(appt => (
              <tr key={appt.id} className="border-t">
                <td className="px-4 py-3">{new Date(appt.appointment_datetime).toLocaleString()}</td>
                <td className="px-4 py-3">{appt.patient?.first_name} {appt.patient?.last_name}</td>
                <td className="px-4 py-3">{appt.provider_name}</td>
                <td className="px-4 py-3">{appt.appointment_type}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    appt.status === 'no_show' ? 'bg-orange-100 text-orange-700' :
                    appt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{appt.status}</span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {!['cancelled', 'completed'].includes(appt.status) && (
                    <>
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value=""
                        aria-label={`Change status for appointment ${appt.id}`}
                        onChange={e => { if (e.target.value) handleStatusChange(appt.id, e.target.value); }}
                      >
                        <option value="">Change status</option>
                        {STATUSES.filter(s => s !== appt.status).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => handleCancel(appt.id)} className="text-red-600 hover:underline text-xs">Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
