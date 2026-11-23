const { randomInt } = require('crypto');

// 32 characters with look-alikes removed (no 0/O, 1/I) so a patient can type
// the code on a kiosk without guessing which character it is.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Generate a random appointment confirmation code (8 chars, ~1.1 trillion
 * combinations). Uses crypto.randomInt so codes are not predictable.
 */
function generateConfirmationCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Normalize user-typed input: trim, uppercase, and drop spaces and dashes so
 * "k7qm-4xwd" and "K7QM 4XWD" both match the stored "K7QM4XWD".
 */
function normalizeConfirmationCode(input) {
  return String(input || '').toUpperCase().replace(/[\s-]/g, '');
}

module.exports = { generateConfirmationCode, normalizeConfirmationCode, ALPHABET, CODE_LENGTH };
