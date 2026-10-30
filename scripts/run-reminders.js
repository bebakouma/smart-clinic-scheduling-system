require('dotenv').config({ path: '../backend/.env' });
const remindersService = require('../backend/src/services/reminders.service');

async function main() {
  console.log('Running reminder check...');
  try {
    const results = await remindersService.runReminders();
    console.log(`Processed ${results.length} reminders`);
    results.forEach(r => {
      console.log(`  - Appointment ${r.appointment_id} [${r.reminder_type}] status=${r.status}`);
    });
  } catch (err) {
    console.error('Error running reminders:', err.message);
  }
  process.exit(0);
}

main();
