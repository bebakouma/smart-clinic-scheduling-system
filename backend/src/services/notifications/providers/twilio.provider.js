/**
 * Twilio SMS provider (production).
 *
 * Activated only when Twilio credentials are set. The twilio package is
 * required lazily so the app runs without it installed. Email is not handled
 * here — email goes through the SendGrid provider.
 *
 * This adapter is intentionally minimal for now (email-first rollout); it is
 * ready to enable once an SMS-capable Twilio number is provisioned.
 */
function createTwilioProvider() {
  // eslint-disable-next-line global-require
  const twilio = require('twilio');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken) throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set');
  if (!fromNumber) throw new Error('TWILIO_FROM_NUMBER is not set');

  const client = twilio(accountSid, authToken);

  return {
    name: 'twilio',

    async sendEmail() {
      // Twilio Messaging sends SMS, not email; email goes through SendGrid.
      throw new Error('Twilio provider does not send email; use the SendGrid provider');
    },

    async sendSms({ to, text }) {
      try {
        const msg = await client.messages.create({ to, from: fromNumber, body: text });
        return { provider: 'twilio', channel: 'sms', status: 'sent', providerMessageId: msg?.sid || null };
      } catch (err) {
        console.error(`[notifications:twilio] sms send failed: ${err.message}`);
        return { provider: 'twilio', channel: 'sms', status: 'failed', providerMessageId: null };
      }
    }
  };
}

module.exports = { createTwilioProvider };
