import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Patients from '../pages/Patients';
import ScheduleAppointment from '../pages/ScheduleAppointment';
import Waitlist from '../pages/Waitlist';
import IntakeForm from '../pages/IntakeForm';
import ReminderLogs from '../pages/ReminderLogs';
import Kiosk from '../pages/Kiosk';

function StaffRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/appointments" element={<ScheduleAppointment />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/intake" element={<IntakeForm />} />
        <Route path="/reminders" element={<ReminderLogs />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Patient kiosk: full screen, no staff sidebar or navigation */}
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/*" element={<StaffRoutes />} />
    </Routes>
  );
}
