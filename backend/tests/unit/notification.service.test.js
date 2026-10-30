const notificationService = require('../../src/services/notifications/notification.service');

describe('Notification service (Task 20)', () => {
  let logSpy;

  beforeEach(() => {
    // Default to the console provider (no network, no accounts).
    process.env.NOTIFICATION_PROVIDER = 'console';
    notificationService._reset();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('console provider (dev/test default)', () => {
    it('should "send" an email and return a sent status without a network call', async () => {
      const result = await notificationService.send({
        channel: 'email',
        to: 'patient@example.com',
        subject: 'Appointment reminder',
        text: 'See you tomorrow at 10 AM.'
      });

      expect(result.status).toBe('sent');
      expect(result.channel).toBe('email');
      expect(result.provider).toBe('console');
    });

    it('should route an sms channel to the sms path', async () => {
      const result = await notificationService.send({
        channel: 'sms',
        to: '+15555550123',
        text: 'See you tomorrow at 10 AM.'
      });

      expect(result.status).toBe('sent');
      expect(result.channel).toBe('sms');
    });

    it('should not log the message body (PII-safe logging)', async () => {
      const secret = 'Patient Jane Doe DOB 1980-01-01 appointment detail';
      await notificationService.send({
        channel: 'email',
        to: 'jane@example.com',
        subject: 'Appointment reminder',
        text: secret
      });

      const logged = logSpy.mock.calls.map(args => args.join(' ')).join('\n');
      expect(logged).not.toContain(secret);
    });
  });

  describe('missing recipient', () => {
    it('should still report sent in console mode when no recipient is on file (logs only)', async () => {
      // The console provider does not deliver anywhere, so a missing recipient
      // is not a real delivery failure in dev/test.
      const result = await notificationService.send({
        channel: 'email',
        to: null,
        subject: 'Appointment reminder',
        text: 'body'
      });

      expect(result.status).toBe('sent');
      expect(result.provider).toBe('console');
    });
  });

  describe('provider fallback', () => {
    it('should fall back to console when a real provider cannot be constructed', async () => {
      // Enable real mode but provide no credentials -> construction fails ->
      // the service must fall back to console rather than crash.
      process.env.NOTIFICATION_PROVIDER = 'sendgrid+twilio';
      delete process.env.SENDGRID_API_KEY;
      delete process.env.TWILIO_ACCOUNT_SID;
      jest.spyOn(console, 'error').mockImplementation(() => {});
      notificationService._reset();

      const result = await notificationService.send({
        channel: 'email',
        to: 'patient@example.com',
        subject: 'Appointment reminder',
        text: 'body'
      });

      expect(result.status).toBe('sent');
      expect(result.provider).toBe('console');

      // Restore default for other tests.
      process.env.NOTIFICATION_PROVIDER = 'console';
      notificationService._reset();
    });
  });
});
