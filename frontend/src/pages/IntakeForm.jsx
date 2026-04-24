import React, { useState, useEffect } from 'react';
import { intakeService, appointmentService } from '../services/api';

export default function IntakeForm() {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({
    appointment_id: '', reason_for_visit: '', insurance_provider: '', insurance_member_id: '',
    allergies: '', medications: '', emergency_contact_name: '', emergency_contact_phone: '', notes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const appts = await appointmentService.getAll({ status: 'scheduled' });
        setAppointments(appts);
      } catch (err) { console.error(err); }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await intakeService.create({ ...form, appointment_id: parseInt(form.appointment_id) });
      setSubmitted(true);
    } catch (err) { setError(err.message); }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-green-700 mb-2">Intake Form Submitted</h2>
        <p className="text-green-600">Your pre-visit information has been recorded.</p>
        <button onClick={() => { setSubmitted(false); setForm({ appointment_id: '', reason_for_visit: '', insurance_provider: '', insurance_member_id: '', allergies: '', medications: '', emergency_contact_name: '', emergency_contact_phone: '', notes: '' }); }} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit Another</button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Patient Intake Form</h2>
      <div className="bg-white rounded-lg shadow p-6">
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" htmlFor="intake_appt">Appointment *</label>
            <select id="intake_appt" className="w-full border rounded px-3 py-2" value={form.appointment_id} onChange={e => setForm({...form, appointment_id: e.target.value})} required>
              <option value="">Select appointment</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.patient?.first_name} {a.patient?.last_name} - {a.appointment_type} ({new Date(a.appointment_datetime).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" htmlFor="reason">Reason for Visit *</label>
            <textarea id="reason" className="w-full border rounded px-3 py-2" value={form.reason_for_visit} onChange={e => setForm({...form, reason_for_visit: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="insurance">Insurance Provider</label>
            <input id="insurance" className="w-full border rounded px-3 py-2" value={form.insurance_provider} onChange={e => setForm({...form, insurance_provider: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="member_id">Member ID</label>
            <input id="member_id" className="w-full border rounded px-3 py-2" value={form.insurance_member_id} onChange={e => setForm({...form, insurance_member_id: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="allergies">Allergies</label>
            <input id="allergies" className="w-full border rounded px-3 py-2" value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="medications">Medications</label>
            <input id="medications" className="w-full border rounded px-3 py-2" value={form.medications} onChange={e => setForm({...form, medications: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ec_name">Emergency Contact Name</label>
            <input id="ec_name" className="w-full border rounded px-3 py-2" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ec_phone">Emergency Contact Phone</label>
            <input id="ec_phone" className="w-full border rounded px-3 py-2" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" htmlFor="intake_notes">Additional Notes</label>
            <textarea id="intake_notes" className="w-full border rounded px-3 py-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Submit Intake Form</button>
          </div>
        </form>
      </div>
    </div>
  );
}
