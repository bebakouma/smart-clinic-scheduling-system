/**
 * Scheduled reminder job (Task 21).
 *
 * Runs the reminder process automatically on an interval using node-cron,
 * replacing the previous manual-only trigger. Design commitments (see
 * docs/discussion-commitments.md):
 *
 *  1. Default interval: every 15 minutes (see DEFAULT_CRON below), configurable via env.
 *  2. Enable/disable the job via env.
 *  3. Non-overlapping execution: a new run will not start while the previous
 *     run is still in progress (in-process guard).
 *  4. The data-level duplicate guard in runReminders() (skip appointments that
 *     already have a reminder log) is preserved.
 *
 * Note: the in-process guard protects a single process. For multi-process /
 * multi-instance deployments, a database-level safeguard (a unique constraint
 * on ReminderLog.appointment_id, or an atomic upsert) is the real fix. Tracked
 * as a follow-up for when the app runs more than one instance.
 *
 * The node-cron dependency is required lazily so unit tests can exercise the
 * non-overlapping runner without scheduling anything.
 */
const remindersService = require('./reminders.service');

const DEFAULT_CRON = '*/15 * * * *'; // every 15 minutes

// Reads schedule config from the environment at call time (not import time) so
// tests and runtime can control it.
function getConfig() {
  const enabled = String(process.env.REMINDER_JOB_ENABLED ?? 'true').toLowerCase() === 'true';
  const cronExpression = process.env.REMINDER_CRON || DEFAULT_CRON;
  return { enabled, cronExpression };
}

/**
 * Create a runner that will not overlap with itself. If invoked while a
 * previous invocation is still in progress, the new invocation is skipped
 * (and reported as skipped) rather than running concurrently.
 *
 * @param {() => Promise<any[]>} [runFn] the reminder run function (injectable for tests)
 * @returns {() => Promise<{ skipped: boolean, count: number }>}
 */
function createGuardedRunner(runFn = remindersService.runReminders) {
  let isRunning = false;

  return async function guardedRun() {
    if (isRunning) {
      console.log('[reminders:scheduler] previous run still in progress, skipping this tick');
      return { skipped: true, count: 0 };
    }

    isRunning = true;
    try {
      const results = await runFn();
      const count = Array.isArray(results) ? results.length : 0;
      console.log(`[reminders:scheduler] run complete, ${count} reminder(s) processed`);
      return { skipped: false, count };
    } catch (err) {
      // Never let a job error crash the process; log a safe summary.
      console.error(`[reminders:scheduler] run failed: ${err.message}`);
      return { skipped: false, count: 0, error: true };
    } finally {
      isRunning = false;
    }
  };
}

/**
 * Start the scheduled job. Returns the cron task when started, or null when the
 * job is disabled via env. Safe to call once at server startup.
 */
function startReminderScheduler() {
  const { enabled, cronExpression } = getConfig();

  if (!enabled) {
    console.log('[reminders:scheduler] disabled via REMINDER_JOB_ENABLED=false');
    return null;
  }

  // Lazy require so tests that only exercise the guarded runner do not need the
  // node-cron package.
  // eslint-disable-next-line global-require
  const cron = require('node-cron');

  if (!cron.validate(cronExpression)) {
    console.error(`[reminders:scheduler] invalid cron expression "${cronExpression}", scheduler not started`);
    return null;
  }

  const guardedRun = createGuardedRunner();
  const task = cron.schedule(cronExpression, guardedRun);
  console.log(`[reminders:scheduler] started with schedule "${cronExpression}"`);
  return task;
}

module.exports = { startReminderScheduler, createGuardedRunner, getConfig, DEFAULT_CRON };
