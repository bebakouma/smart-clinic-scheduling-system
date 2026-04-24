const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };

  const response = await fetch(url, config);
  const json = await response.json();

  if (!response.ok) {
    const error = new Error(json.error?.message || 'Request failed');
    error.details = json.error?.details;
    error.status = response.status;
    throw error;
  }

  return json.data;
}

export const patientService = {
  getAll: () => request('/patients'),
  getById: (id) => request(`/patients/${id}`),
  create: (data) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/patients/${id}`, { method: 'DELETE' })
};

export const appointmentService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/appointments${query ? `?${query}` : ''}`);
  },
  getById: (id) => request(`/appointments/${id}`),
  create: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id) => request(`/appointments/${id}`, { method: 'DELETE' })
};

export const waitlistService = {
  getAll: () => request('/waitlist'),
  create: (data) => request('/waitlist', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/waitlist/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
};

export const intakeService = {
  getByAppointmentId: (appointmentId) => request(`/intake/${appointmentId}`),
  create: (data) => request('/intake', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/intake/${id}`, { method: 'PUT', body: JSON.stringify(data) })
};

export const dashboardService = {
  getSummary: () => request('/dashboard/summary'),
  getToday: () => request('/dashboard/today'),
  getNoShows: () => request('/dashboard/no-shows')
};

export const reminderService = {
  getLogs: () => request('/reminders/logs'),
  run: () => request('/reminders/run', { method: 'POST' })
};
