#!/usr/bin/env node
/**
 * Simulated IoT check-in device (Task 24).
 *
 * Pretends to be a waiting-room device, for example a badge/QR scanner with a
 * people counter. It sends two kinds of events to the backend over HTTP:
 *   checkin    - a scanned appointment confirmation code
 *   occupancy  - how many people are in the waiting room
 *
 * Needs only Node 18+ (built-in fetch). No packages to install.
 *
 * Configuration (environment variables):
 *   DEVICE_TOKEN    required. Must match DEVICE_TOKEN on the backend.
 *   DEVICE_ID       optional. Default "sim-device-1".
 *   DEVICE_API_URL  optional. Default http://localhost:3000/api/device/events
 *
 * Usage:
 *   node scripts/iot-device-simulator.js checkin <CODE>
 *   node scripts/iot-device-simulator.js occupancy <COUNT>
 *   node scripts/iot-device-simulator.js run [--codes A,B,C] [--interval 10] [--ticks 6] [--start-count 0]
 *
 * The device token is a temporary shared placeholder (replaced in Task 26). It
 * is read only from the environment and is never printed.
 */

const DEFAULT_URL = 'http://localhost:3000/api/device/events';
const DEFAULT_DEVICE_ID = 'sim-device-1';
const REQUEST_TIMEOUT_MS = 5000;

const USAGE = `Usage:
  node scripts/iot-device-simulator.js checkin <CODE>
  node scripts/iot-device-simulator.js occupancy <COUNT>
  node scripts/iot-device-simulator.js run [--codes A,B,C] [--interval 10] [--ticks 6] [--start-count 0]

Environment: DEVICE_TOKEN (required), DEVICE_ID, DEVICE_API_URL`;

class UsageError extends Error {}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positional = [];
  const options = {};

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new UsageError(`Option ${arg} needs a value`);
      }
      options[arg.slice(2)] = value;
      i += 1;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, options };
}

function parseNonNegativeInt(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new UsageError(`${name} must be a whole number, 0 or more`);
  return n;
}

function parsePositiveNumber(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new UsageError(`${name} must be a number greater than 0`);
  return n;
}

function buildEvent(deviceId, type, payload) {
  const event = { deviceId, type, timestamp: new Date().toISOString() };
  if (type === 'checkin') event.confirmationCode = payload;
  if (type === 'occupancy') event.count = payload;
  return event;
}

// Codes are secrets: show only the first two characters in the log.
function maskCode(code) {
  const text = String(code);
  return `${text.slice(0, 2)}${'*'.repeat(Math.max(text.length - 2, 0))}`;
}

function describeEvent(event) {
  return event.type === 'checkin'
    ? `checkin ${maskCode(event.confirmationCode)}`
    : `occupancy ${event.count}`;
}

/**
 * Send one event. Never throws: a network problem is reported as status 0.
 * The token goes in the X-Device-Token header and nowhere else.
 */
async function sendEvent(event, { url, token, fetchImpl = fetch }) {
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': token },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    let body = null;
    try {
      body = await response.json();
    } catch (err) {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data: body && body.data,
      error: body && body.error && body.error.message
    };
  } catch (err) {
    return { ok: false, status: 0, error: `Could not reach the backend (${err.message})` };
  }
}

function summarize(result) {
  if (result.ok) {
    return `${result.status} OK${result.data && result.data.status ? ` (${result.data.status})` : ''}`;
  }
  return `${result.status} ${result.error || 'failed'}`;
}

function isLocalUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (err) {
    return false;
  }
}

async function main({ argv, env, fetchImpl = fetch, log = console.log, sleep } = {}) {
  const wait = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  const token = env.DEVICE_TOKEN;
  if (!token) {
    log('DEVICE_TOKEN is not set. Set it to the same value as the backend DEVICE_TOKEN.');
    return 2;
  }

  const deviceId = env.DEVICE_ID || DEFAULT_DEVICE_ID;
  const url = env.DEVICE_API_URL || DEFAULT_URL;
  const send = (event) => sendEvent(event, { url, token, fetchImpl });

  if (url.startsWith('http://') && !isLocalUrl(url)) {
    log('Warning: this URL does not use TLS, so the device token travels in plain text.');
  }

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    log(`${err.message}\n${USAGE}`);
    return 2;
  }
  const { command, positional, options } = parsed;

  try {
    if (command === 'checkin') {
      if (!positional[0]) throw new UsageError('checkin needs a confirmation code');
      const event = buildEvent(deviceId, 'checkin', positional[0]);
      const result = await send(event);
      log(`[${deviceId}] ${describeEvent(event)} -> ${summarize(result)}`);
      return result.ok ? 0 : 1;
    }

    if (command === 'occupancy') {
      const count = parseNonNegativeInt(positional[0], 'COUNT');
      const event = buildEvent(deviceId, 'occupancy', count);
      const result = await send(event);
      log(`[${deviceId}] ${describeEvent(event)} -> ${summarize(result)}`);
      return result.ok ? 0 : 1;
    }

    if (command === 'run') {
      const codes = options.codes ? options.codes.split(',').map((c) => c.trim()).filter(Boolean) : [];
      const intervalSeconds = parsePositiveNumber(options.interval ?? '10', '--interval');
      const ticks = parseNonNegativeInt(options.ticks ?? '6', '--ticks');
      let count = parseNonNegativeInt(options['start-count'] ?? '0', '--start-count');
      let failures = 0;

      log(`[${deviceId}] starting: ${ticks} tick(s), every ${intervalSeconds}s, ${codes.length} code(s) to scan`);

      for (let tick = 1; tick <= ticks; tick += 1) {
        // One scan per tick while codes remain. Each successful check-in adds a
        // person to the waiting room.
        if (codes.length > 0) {
          const checkin = buildEvent(deviceId, 'checkin', codes.shift());
          const result = await send(checkin);
          log(`[${deviceId}] ${describeEvent(checkin)} -> ${summarize(result)}`);
          if (result.ok) count += 1;
          else failures += 1;
        }

        const occupancy = buildEvent(deviceId, 'occupancy', count);
        const result = await send(occupancy);
        log(`[${deviceId}] ${describeEvent(occupancy)} -> ${summarize(result)}`);
        if (!result.ok) failures += 1;

        if (tick < ticks) await wait(intervalSeconds * 1000);
      }

      log(`[${deviceId}] done, ${failures} failed event(s)`);
      return failures > 0 ? 1 : 0;
    }

    throw new UsageError(command ? `Unknown command "${command}"` : 'No command given');
  } catch (err) {
    if (err instanceof UsageError) {
      log(`${err.message}\n${USAGE}`);
      return 2;
    }
    throw err;
  }
}

module.exports = { parseArgs, buildEvent, maskCode, sendEvent, main, DEFAULT_URL, DEFAULT_DEVICE_ID };

if (require.main === module) {
  // Set exitCode and let Node exit by itself. Calling process.exit() right after
  // a fetch can crash on Windows ("Assertion failed: UV_HANDLE_CLOSING") while
  // the HTTP connection is still closing, which turns a success into a failure.
  main({ argv: process.argv.slice(2), env: process.env }).then(
    (code) => { process.exitCode = code; },
    (err) => {
      console.error(`Unexpected error: ${err.message}`);
      process.exitCode = 1;
    }
  );
}
