import React, { useState, useEffect } from 'react';
import { reminderService } from '../services/api';

export default function ReminderLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await reminderService.getLogs();
      setLogs(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleRunReminders() {
    try {
      await reminderService.run();
      load();
    } catch (err) { alert(err.message); }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reminder Logs</h2>
        <button onClick={handleRunReminders} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Run Reminders</button>
      </div>

      {logs.length === 0 ? (
        <p className="text-gray-500">No reminder logs yet. Click "Run Reminders" to generate reminders for upcoming appointments.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Sent At</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-3">{new Date(log.sent_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.patient?.first_name} {log.patient?.last_name}</td>
                  <td className="px-4 py-3">{log.reminder_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{log.status}</span>
                  </td>
                  <td className="px-4 py-3 max-w-md truncate">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
