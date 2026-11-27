const appointmentsService = require('./appointments.service');
const { normalizeConfirmationCode } = require('../utils/confirmationCode');

/**
 * Handles events sent by IoT devices (Task 24).
 *
 * Event types:
 *   checkin    - the device scanned an appointment confirmation code
 *   occupancy  - the device reports how many people are in the waiting room
 *
 * The device itself is authenticated by the deviceAuth middleware, so a check-in
 * event needs only the scanned code (like scanning a boarding pass). The
 * response never includes patient details.
 */

// Latest waiting-room count reported by each device.
// Kept in memory for now: Task 25 (real-time dashboard) decides whether it needs
// to be stored. It resets when the server restarts and is not shared between
// server instances.
const occupancyByDevice = new Map();

async function handleEvent(event) {
  if (event.type === 'occupancy') {
    occupancyByDevice.set(event.deviceId, {
      count: event.count,
      received_at: new Date()
    });
    return { type: 'occupancy', accepted: true };
  }

  // type === 'checkin' (the validator only allows these two types)
  const confirmationCode = normalizeConfirmationCode(event.confirmationCode);
  const appointment = await appointmentsService.checkIn({ confirmationCode });

  return {
    type: 'checkin',
    appointment_id: appointment.id,
    status: appointment.status,
    checked_in_at: appointment.checked_in_at
  };
}

function getOccupancy() {
  return Array.from(occupancyByDevice, ([deviceId, value]) => ({ deviceId, ...value }));
}

// For tests.
function _reset() {
  occupancyByDevice.clear();
}

module.exports = { handleEvent, getOccupancy, _reset };
