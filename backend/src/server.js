require('dotenv').config();
const app = require('./app');
const { startReminderScheduler } = require('./services/reminders.scheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Smart Clinic API running on port ${PORT}`);
  // Start the automatic reminder job (enable/disable + interval via env).
  startReminderScheduler();
});
