const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const patientsRoutes = require('./routes/patients.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const remindersRoutes = require('./routes/reminders.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const intakeRoutes = require('./routes/intake.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
