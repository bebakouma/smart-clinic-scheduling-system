const {
  createGuardedRunner,
  getConfig,
  DEFAULT_CRON
} = require('../../src/services/reminders.scheduler');

describe('Reminder scheduler (Task 21)', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.REMINDER_JOB_ENABLED;
    delete process.env.REMINDER_CRON;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('configuration', () => {
    it('should default to enabled with a 15-minute interval', () => {
      const { enabled, cronExpression } = getConfig();
      expect(enabled).toBe(true);
      expect(cronExpression).toBe(DEFAULT_CRON);
      expect(DEFAULT_CRON).toBe('*/15 * * * *');
    });

    it('should disable the job when REMINDER_JOB_ENABLED=false', () => {
      process.env.REMINDER_JOB_ENABLED = 'false';
      expect(getConfig().enabled).toBe(false);
    });

    it('should use a custom cron expression from the environment', () => {
      process.env.REMINDER_CRON = '0 * * * *'; // hourly
      expect(getConfig().cronExpression).toBe('0 * * * *');
    });
  });

  describe('non-overlapping execution guard', () => {
    it('should run the reminder function when not already running', async () => {
      const runFn = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const guardedRun = createGuardedRunner(runFn);

      const result = await guardedRun();

      expect(runFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ skipped: false, count: 2 });
    });

    it('should skip a new run while a previous run is still in progress', async () => {
      // A runFn that stays pending until we resolve it manually, simulating a
      // long-running tick that overlaps the next scheduled trigger.
      let resolveRun;
      const runFn = jest.fn(() => new Promise(res => { resolveRun = res; }));
      const guardedRun = createGuardedRunner(runFn);

      const firstRun = guardedRun();           // starts, stays pending
      const secondResult = await guardedRun();  // fires while first is running

      // The overlapping invocation must be skipped, not run concurrently.
      expect(secondResult).toEqual({ skipped: true, count: 0 });
      expect(runFn).toHaveBeenCalledTimes(1);

      // Finish the first run and confirm it completed normally.
      resolveRun([{ id: 1 }]);
      const firstResult = await firstRun;
      expect(firstResult).toEqual({ skipped: false, count: 1 });
    });

    it('should allow a subsequent run after the previous one finishes', async () => {
      const runFn = jest.fn().mockResolvedValue([{ id: 1 }]);
      const guardedRun = createGuardedRunner(runFn);

      await guardedRun();
      await guardedRun();

      expect(runFn).toHaveBeenCalledTimes(2);
    });

    it('should not crash and should release the guard when the run throws', async () => {
      const runFn = jest.fn()
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce([{ id: 1 }]);
      const guardedRun = createGuardedRunner(runFn);

      const failed = await guardedRun();
      expect(failed.error).toBe(true);

      // Guard must be released after an error so the next tick can run.
      const ok = await guardedRun();
      expect(ok).toEqual({ skipped: false, count: 1 });
    });
  });
});
