import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sum, today] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getToday()
        ]);
        setSummary(sum);
        setTodayAppts(today);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard...</p>;

  const cards = summary ? [
    { label: "Today's Appointments", value: summary.today, color: 'blue' },
    { label: 'Upcoming', value: summary.upcoming, color: 'green' },
    { label: 'Cancelled', value: summary.cancelled, color: 'yellow' },
    { label: 'No-Shows', value: summary.no_shows, color: 'red' },
    { label: 'Waitlist Active', value: summary.waitlist_active, color: 'purple' }
  ] : [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`bg-white rounded-lg shadow p-4 border-l-4 border-${card.color}-500`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold mb-4">Today's Appointments</h3>
      {todayAppts.length === 0 ? (
        <p className="text-gray-500">No appointments today.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAppts.map(appt => (
                <tr key={appt.id} className="border-t">
                  <td className="px-4 py-3">{new Date(appt.appointment_datetime).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">{appt.patient?.first_name} {appt.patient?.last_name}</td>
                  <td className="px-4 py-3">{appt.provider_name}</td>
                  <td className="px-4 py-3">{appt.appointment_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{appt.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
