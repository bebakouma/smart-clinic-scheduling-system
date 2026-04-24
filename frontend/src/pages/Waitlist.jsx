import React, { useState, useEffect } from 'react';
import { waitlistService, patientService } from '../services/api';

export default function Waitlist() {
  const [entries, setEntries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '', requested_appointment_type: '', preferred_date: '', preferred_time_range: '' });
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [w, p] = await Promise.all([waitlistService.getAll(), patientService.getAll()]);
      setEntries(w);
      setPatients(p);
    } catch (err) { console.error(err); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await waitlistService.create({ ...form, patient_id: parseInt(form.patient_id) });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Waitlist</h2>
        <button onClick={() => { setShowForm(true); setError(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add to Waitlist</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add to Waitlist</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="wl_patient">Patient *</label>
              <select id="wl_patient" className="w-full border rounded px-3 py-2" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="wl_type">Appointment Type *</label>
              <input id="wl_type" className="w-full border rounded px-3 py-2" value={form.requested_appointment_type} onChange={e => setForm({...form, requested_appointment_type: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="wl_date">Preferred Date</label>
              <input id="wl_date" type="date" className="w-full border rounded px-3 py-2" value={form.preferred_date} onChange={e => setForm({...form, preferred_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="wl_time">Preferred Time Range</label>
              <input id="wl_time" className="w-full border rounded px-3 py-2" placeholder="e.g. morning, afternoon" value={form.preferred_time_range} onChange={e => setForm({...form, preferred_time_range: e.target.value})} />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Type Requested</th>
              <th className="px-4 py-3 text-left">Preferred Date</th>
              <th className="px-4 py-3 text-left">Time Range</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Notified At</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className="border-t">
                <td className="px-4 py-3">{entry.patient?.first_name} {entry.patient?.last_name}</td>
                <td className="px-4 py-3">{entry.requested_appointment_type}</td>
                <td className="px-4 py-3">{entry.preferred_date ? new Date(entry.preferred_date).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3">{entry.preferred_time_range || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    entry.status === 'notified' ? 'bg-green-100 text-green-700' :
                    entry.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{entry.status}</span>
                </td>
                <td className="px-4 py-3">{entry.notified_at ? new Date(entry.notified_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
