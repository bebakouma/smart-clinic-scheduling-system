# Simulated IoT Check-In Device (Task 24)

A Node script that pretends to be a waiting-room device, for example a QR/badge
scanner with a people counter. It sends events to the backend over HTTP.

Needs Node 18 or newer. There is nothing to install.

> **Security status: temporary placeholder.** Device requests are protected by one
> shared token. This is basic protection so the endpoint is not open while the IoT
> flow is built. Task 26 replaces it with a unique token for each device and TLS.
> See [Security notes](#security-notes) for what it does and does not protect.

## How the pieces fit

```
simulator  --HTTP POST /api/device/events + X-Device-Token-->  backend
                                                                 |
                                       token check (401 if wrong, before anything else)
                                                                 |
                                       validate event  ->  check-in rules / occupancy
```

## Setup

1. Make a token and put it in the backend environment (`backend/.env`):

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   ```
   DEVICE_TOKEN=<the value you generated>
   ```

   If `DEVICE_TOKEN` is empty, the backend rejects every device request.

2. Start the backend (`npm run dev` in `backend`).

3. In the terminal where you run the simulator, set the same token.

   PowerShell:
   ```
   $env:DEVICE_TOKEN = "<the same value>"
   ```
   bash:
   ```
   export DEVICE_TOKEN=<the same value>
   ```

Optional settings for the simulator:

| Variable | Default | Meaning |
|----------|---------|---------|
| `DEVICE_ID` | `sim-device-1` | Name this device reports |
| `DEVICE_API_URL` | `http://localhost:3000/api/device/events` | Where to send events (use port 3001 with docker compose) |

## Running the simulator

Run these from the project root.

**Send one occupancy event** (people in the waiting room):
```
node scripts/iot-device-simulator.js occupancy 4
```

**Scan one confirmation code** (checks the patient in):
```
node scripts/iot-device-simulator.js checkin K7QM4XWD
```

**Run a short session**: scans each code in turn and reports the waiting-room
count after every tick. The count starts at `--start-count` and goes up by one
for every successful check-in.
```
node scripts/iot-device-simulator.js run --codes K7QM4XWD,ABCD2345 --interval 5 --ticks 6 --start-count 0
```

| Option | Default | Meaning |
|--------|---------|---------|
| `--codes` | none | Comma-separated confirmation codes to scan, one per tick |
| `--interval` | 10 | Seconds between ticks |
| `--ticks` | 6 | How many ticks to run |
| `--start-count` | 0 | People already in the waiting room |

Example output:
```
[sim-device-1] starting: 3 tick(s), every 5s, 2 code(s) to scan
[sim-device-1] checkin K7****** -> 200 OK (checked_in)
[sim-device-1] occupancy 1 -> 200 OK
[sim-device-1] checkin AB****** -> 404 Appointment not found
[sim-device-1] occupancy 1 -> 200 OK
[sim-device-1] occupancy 1 -> 200 OK
[sim-device-1] done, 1 failed event(s)
```

The exit code is `0` when every event was accepted, `1` when any event was
rejected or the backend could not be reached, and `2` for a usage or setup
problem (for example `DEVICE_TOKEN` not set).

To get a real confirmation code, create an appointment in the app. The code is on
the appointment and in its reminder message.

## Event format

`POST /api/device/events` with the header `X-Device-Token`.

Check-in:
```json
{ "deviceId": "sim-device-1", "type": "checkin", "confirmationCode": "K7QM4XWD" }
```
Response (no patient details are returned):
```json
{ "data": { "type": "checkin", "appointment_id": 7, "status": "checked_in", "checked_in_at": "..." } }
```

Occupancy:
```json
{ "deviceId": "sim-device-1", "type": "occupancy", "count": 4 }
```
Response: `{ "data": { "type": "occupancy", "accepted": true } }`

Rules: `deviceId` is 1 to 64 letters, digits, `-` or `_`. `count` is a whole number from
0 to 1000. A `timestamp` (ISO date) is optional. Any other field is rejected.

| Status | Meaning |
|--------|---------|
| 200 | Event accepted |
| 400 | Event is malformed |
| 401 | Missing or wrong device token |
| 404 | Check-in: no appointment has that code |
| 409 | Check-in: appointment is cancelled, completed, no-show, or already checked in |

## Security notes

What the placeholder does:
- The token check runs first. A wrong or missing token gets `401` before the body is
  validated and before any database work.
- If `DEVICE_TOKEN` is not set, every device request is rejected (fails closed).
- The token is compared in constant time, comes only from the environment, is never
  committed, and is never printed by the backend or the simulator.
- Check-in responses contain no patient details, and the simulator masks codes in its output.

What it does not do (Task 26):
- It is one shared token, so every device has the same credential and `deviceId` is a
  label, not a verified identity. Anyone with the token can claim any device id.
- A single device cannot be revoked.
- Without TLS the token travels in plain text. The simulator warns when it is
  pointed at a non-local `http://` URL.
- It protects the device endpoint only. The patient kiosk page in the browser
  (`/api/kiosk/*`) cannot hold a secret, because anything in a web page is visible,
  so it still relies on the confirmation code, date of birth, and a rate limit.

## Known limits

- The waiting-room count is held in memory (the latest value for each device). It is
  lost when the server restarts. Task 25 decides how the dashboard reads it.
- HTTP only. MQTT was not used because it needs a separate message broker.
