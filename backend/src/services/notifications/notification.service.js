/**
 * Notification service abstraction.
 *
 * The rest of the app depends on this single interface, not on any specific
 * provider. The active provider(s) are chosen from environment config:
 *
 *   NOTIFICATION_PROVIDER = console | sendgrid+twilio
 *
 * Default is "console", which logs instead of sending (dev/test, no account
 * needed). Real providers activate only when their credentials are present;
 * if a real provider cannot be constructed (missing package or key), we fall
 * back to the console provider so the app never crashes on startup.
 *
 * Channel routing:
 *   - email  -> SendGrid in production, console otherwise
 *   - sms    -> Twilio in production, console otherwise
 */
const { createConsoleProvider } = require('./providers/console.provider');

let emailProvider;
let smsProvider;

function buildProviders() {
  const mode = (process.env.NOTIFICATION_PROVIDER || 'console').toLowerCase();
  const consoleProvider = createConsoleProvider();

  if (mode === 'console') {
    return { email: consoleProvider, sms: consoleProvider };
  }

  // Production-style: try real providers, fall back to console on failure.
  let email = consoleProvider;
  let sms = consoleProvider;

  try {
    const { createSendgridProvider } = require('./providers/sendgrid.provider');
    email = createSendgridProvider();
  } catch (err) {
    console.error(`[notifications] SendGrid unavailable, using console for email: ${err.message}`);
  }

  try {
    const { createTwilioProvider } = require('./providers/twilio.provider');
    sms = createTwilioProvider();
  } catch (err) {
    console.error(`[notifications] Twilio unavailable, using console for sms: ${err.message}`);
  }

  return { email, sms };
}

function getProviders() {
  if (!emailProvider || !smsProvider) {
    const providers = buildProviders();
    emailProvider = providers.email;
    smsProvider = providers.sms;
  }
  return { email: emailProvider, sms: smsProvider };
}

/**
 * Send a notification over the channel that matches the patient's preferred
 * contact method. Returns a normalized result:
 *   { provider, channel, status: 'sent' | 'failed', providerMessageId }
 *
 * @param {object} params
 * @param {'email'|'sms'} params.channel
 * @param {string} params.to      recipient email or phone
 * @param {string} params.subject email subject (ignored for sms)
 * @param {string} params.text    message body
 */
async function send({ channel, to, subject, text }) {
  const { email, sms } = getProviders();
  const provider = channel === 'sms' ? sms : email;

  // A real provider cannot deliver without a recipient, so record 'failed'.
  // The console provider (dev/test) just logs, so a missing recipient there is
  // not a delivery failure — it still reports 'sent'.
  if (!to && provider.name !== 'console') {
    return { provider: provider.name, channel, status: 'failed', providerMessageId: null };
  }

  if (channel === 'sms') {
    return provider.sendSms({ to, text });
  }
  return provider.sendEmail({ to, subject, text });
}

// Exposed for tests so provider selection can be re-evaluated after changing
// environment variables.
function _reset() {
  emailProvider = undefined;
  smsProvider = undefined;
}

module.exports = { send, _reset };
