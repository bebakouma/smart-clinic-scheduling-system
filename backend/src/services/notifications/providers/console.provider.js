/**
 * Console notification provider (dev/test default).
 *
 * Does NOT send anything over the network. It logs what WOULD be sent and
 * returns a success result. This lets the whole reminder pipeline run and be
 * tested offline, with no accounts, credentials, or cost.
 *
 * PII note: we log only the channel and recipient, never the full message body
 * (which could contain appointment/patient detail).
 */
function createConsoleProvider() {
  return {
    name: 'console',

    async sendEmail({ to, subject }) {
      console.log(`[notifications:console] would send EMAIL to <${to}> subject="${subject}"`);
      return { provider: 'console', channel: 'email', status: 'sent', providerMessageId: null };
    },

    async sendSms({ to }) {
      console.log(`[notifications:console] would send SMS to <${to}>`);
      return { provider: 'console', channel: 'sms', status: 'sent', providerMessageId: null };
    }
  };
}

module.exports = { createConsoleProvider };
