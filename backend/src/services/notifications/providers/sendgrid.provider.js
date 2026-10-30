/**
 * SendGrid email provider (production).
 *
 * Activated only when SENDGRID_API_KEY is set. The @sendgrid/mail package is
 * required lazily so the app runs without it installed (dev/test use the
 * console provider instead). If the package or key is missing, construction
 * throws and the factory falls back to console.
 */
function createSendgridProvider() {
  // Lazy require so a missing optional dependency does not crash the app.
  // eslint-disable-next-line global-require
  const sgMail = require('@sendgrid/mail');

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not set');
  if (!fromEmail) throw new Error('SENDGRID_FROM_EMAIL is not set');

  sgMail.setApiKey(apiKey);

  return {
    name: 'sendgrid',

    async sendEmail({ to, subject, text }) {
      try {
        const [response] = await sgMail.send({ to, from: fromEmail, subject, text });
        return {
          provider: 'sendgrid',
          channel: 'email',
          status: 'sent',
          providerMessageId: response?.headers?.['x-message-id'] || null
        };
      } catch (err) {
        // Log only a safe summary, never the message body.
        console.error(`[notifications:sendgrid] email send failed: ${err.message}`);
        return { provider: 'sendgrid', channel: 'email', status: 'failed', providerMessageId: null };
      }
    },

    async sendSms() {
      // SendGrid does not send SMS; SMS goes through Twilio.
      throw new Error('SendGrid does not support SMS; use the Twilio provider');
    }
  };
}

module.exports = { createSendgridProvider };
