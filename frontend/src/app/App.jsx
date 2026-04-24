import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Patients from '../pages/Patients';
import ScheduleAppointment from '../pages/ScheduleAppointment';
import Waitlist from '../pages/Waitlist';
import IntakeForm from '../pages/IntakeForm';
import ReminderLogs from '../pages/ReminderLogs';

export default function App() {
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
