require('dotenv').config({ path: '../backend/.env' });
const remindersService = require('../backend/src/services/reminders.service');

async function main() {
  console.log('Running reminder check...');
  try {
    const results = await remindersService.runReminders();
    console.log(`Sent ${results.length} reminders`);
    results.forEach(r => {
      console.log(`  - Reminder for appointment ${r.appointment_id}: ${r.message}`);
    });
  } catch (err) {
    console.error('Error running reminders:', err.message);
  }
  process.exit(0);
}

main();
