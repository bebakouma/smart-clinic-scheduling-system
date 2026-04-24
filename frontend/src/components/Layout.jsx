import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/patients', label: 'Patients', icon: '👤' },
  { path: '/appointments', label: 'Appointments', icon: '📅' },
  { path: '/waitlist', label: 'Waitlist', icon: '⏳' },
  { path: '/intake', label: 'Intake Forms', icon: '📋' },
  { path: '/reminders', label: 'Reminder Logs', icon: '🔔' }
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">Smart Clinic</h1>
          <p className="text-sm text-gray-500">Scheduling System</p>
        </div>
        <nav className="p-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
