# Discussion Commitments

Questions and answers from the weekly capstone discussion posts (professor and
peers), captured so the commitments made publicly are carried into the
implementation. Review the relevant section before building each task.

> How to use this file: each entry records who asked, what was asked, what I
> answered, and the concrete implementation implications ("commitments"). When
> implementing a task, confirm the code matches the commitments listed here.

---

## Task 20 — Real notification integration (SendGrid / Twilio)

### Q (Prof. Hatim Alzoubi): Are you leaning toward SendGrid or Twilio, and why?
**My answer (corrected):** Leaning toward the Twilio ecosystem. Twilio owns
SendGrid, so SendGrid is used for email and Twilio for SMS under one vendor with
a shared login. They keep separate APIs, SDKs, and billing, but both offer
well-documented Node.js SDKs that fit the existing Express backend. Plan: start
with email through SendGrid, then add SMS through Twilio, keeping patient
information secure throughout.

**Commitments / implications:**
- SendGrid = email, Twilio = SMS (two separate SDKs, not one unified API). ✅ implemented as two providers.
- Email-first rollout; SMS adapter present but minimal. ✅ `twilio.provider.js` is ready but minimal.
- Keep patient info secure: credentials in env vars (never committed); send only the minimum needed. ✅ env-based keys; console provider logs channel/recipient only, never the message body.

### Q (Peer, Mia Lee): I've never heard of SendGrid or Twilio. How will they help you meet next week's goal and continue the project?
**My answer:** SendGrid sends emails, Twilio sends SMS. Example: a patient with a
10 AM appointment tomorrow automatically gets an email (SendGrid) or text
(Twilio) reminder, so staff don't contact each patient manually. Next-week goal:
create accounts, get API credentials, write code to connect to the Node.js
backend, then test the reminder process.

**Commitments / implications:**
- The reminder flow must demonstrably produce a reminder per eligible appointment. ✅ wired into `reminders.service.js`.
- Accounts/credentials are only needed for real delivery; dev/test uses the console provider (no account). ✅ default `NOTIFICATION_PROVIDER=console`.

---

## Task 21 — Scheduled reminder job (node-cron)  [DONE — see status per item]

### Q (Prof. Hatim Alzoubi): What interval are you planning for node-cron? How will you avoid duplicate reminders if a run overlaps the next scheduled trigger?
**My answer:**
- Run every 15 minutes (`*/15 * * * *`). Reminders target appointments within
  the next 24 hours, so 15 minutes is frequent enough to catch new appointments
  without unnecessary DB load.
- Duplicate prevention is at the data level: the reminder service already skips
  any appointment that already has a reminder log, so even if runs overlap or an
  appointment is picked up twice, only one reminder is recorded.
- Plan to prevent overlapping runs (a new run won't start while the previous is
  still processing).
- Will look at a database-level safeguard (e.g., a unique constraint on the
  reminder log) for the case where multiple processes run the job at once.
- Interval and an enable/disable option will be configurable via environment
  variables.

**Commitments to implement in Task 21 (status):**
1. ✅ Default cron `*/15 * * * *`, configurable via `REMINDER_CRON`. (`DEFAULT_CRON` in reminders.scheduler.js)
2. ✅ Enable/disable flag via `REMINDER_JOB_ENABLED` (default true).
3. ✅ Non-overlapping execution guard — `createGuardedRunner()` uses an in-process `isRunning` flag; an overlapping tick is skipped, not run concurrently. Covered by unit tests.
4. ✅ Data-level duplicate guard preserved — `runReminders()` still skips appointments that already have a reminder log (unchanged).
5. ⏳ DEFERRED (documented): database-level safeguard — a unique constraint on
   `ReminderLog.appointment_id` (or atomic upsert) to close the cross-process
   read-then-write race. The in-process guard handles the single-instance case
   we run today; the DB constraint is the real fix once more than one instance
   runs (deployment / Task 28+). Called out in the Task 21 code comments and
   tasks.md as a follow-up, consistent with "I'll look at a DB-level safeguard."

---

## Task 22 — Patient check-in endpoint  [DONE]

### Q (Prof. Hatim Alzoubi): For Task 22, will the checked-in status be set only by staff, or will patients also be able to trigger it themselves?
**My answer:** Starting with staff-managed check-in (authorized clinic staff update
an appointment to checked-in when a patient arrives). Patient self check-in via a
kiosk / tablet (possibly a Raspberry Pi) comes later, with the system verifying the
appointment before updating its status. Focus first on the basic endpoint, tested.

**Commitments / implications (status):**
1. ✅ Staff-managed first — `POST /api/checkin` is protected by `requireRole(['admin','staff'])`.
2. ✅ Verify the appointment before updating — check-in rejects not-found, terminal (cancelled/completed), no_show, and already-checked-in states.
3. ⏳ Patient self check-in (kiosk/tablet, possibly Raspberry Pi) deferred to Tasks 23-26. Note to self: the IoT device in Task 24 is a *software simulator* first; a Raspberry Pi is the hardware target if taken further — do not overcommit to hardware.
4. ⏳ When self check-in is added, device/kiosk requests must authenticate (device token/API key) per Task 26 — the current endpoint is staff-JWT only.

---

## Task 23 — Check-in kiosk UI  [DONE]

### Q (Prof. Hatim Alzoubi): For Task 23, how will the kiosk verify the patient's identity before matching them to an appointment?
**My answer:** The kiosk asks for the appointment confirmation code and date of
birth, and only matches an appointment when both agree. A failed attempt returns
the same generic error either way, and the confirmation screen shows only minimal
details (first name and appointment time). Since the kiosk is not a staff user, its
requests will be secured with a device token in Task 26.

**Commitments / implications (status):**
1. ✅ Code + date of birth required — `verifyKioskIdentity()` in `appointments.service.js`.
2. ✅ Same generic error for wrong code and wrong date of birth (covered by unit and integration tests).
3. ✅ Minimal response: only `first_name` and `appointment_datetime` (tests assert no last name, phone, email, notes, or date of birth).
4. ✅ Identity is verified again on the check-in call, so the server never trusts the lookup step.
5. ⏳ Device token for kiosk requests — Task 26. Until then `/api/kiosk/*` is open to anyone who has a valid code AND the matching date of birth, limited by the kiosk rate limit. Do not describe the kiosk as device-authenticated before Task 26 is done.
6. Date of birth is a lightweight check suited to self check-in, not strong identity verification.

---

## Task 24 — Simulated IoT check-in device  [UPCOMING — honor these]
## Task 26 — IoT security  [UPCOMING — honor these]

### Q (Prof. Hatim Alzoubi): For Task 24, will the simulated IoT device run with no auth check at all until Task 26, or will you put a temporary placeholder check in now?
**My answer:** A temporary placeholder check now, rather than leaving the device
endpoint open. The simulated device sends a token with each request, and the
backend validates it before processing the check-in event. In Task 26 this is
replaced by unique device credentials and stronger authentication, so the IoT
integration can be tested in Task 24 with basic security in place.

**Commitments to implement in Task 24:**
1. A placeholder device token check on the device endpoint. Plan: one shared token in an environment variable (e.g. `DEVICE_TOKEN`), sent by the simulator in a header, compared with a timing-safe comparison.
2. The backend rejects a missing or wrong token (401) BEFORE processing the event or touching the database.
3. The token is never hardcoded, never committed, and never logged. Add it to `.env.example` with an empty value.
4. Tests: valid token accepted, missing token rejected, wrong token rejected.
5. Document clearly that this is a temporary placeholder, not the final design.
6. Be accurate about scope: this protects the simulated device endpoint only. The browser kiosk (`/api/kiosk/*`) cannot hold a secret safely, because anything in a web page is visible, so it stays protected by confirmation code + date of birth + rate limit. Do not describe the kiosk as token-protected.

**Commitments to implement in Task 26:**
1. Replace the shared placeholder with a unique token for each device.
2. Enforce TLS for device communication in production config.
3. Tests for device auth (valid / invalid / missing token), as already listed in `tasks.md`.
4. "Stronger authentication" was promised in the reply but is not defined. Decide what it means (for example: tokens stored hashed, per-device identity in logs, short-lived tokens) and write it down before building.
5. Token revocation: CONFIRM whether the posted reply included it. If it did, it needs a device table and a revoke action, which is more than `tasks.md` currently lists, so add it to Task 26 in `tasks.md` first. If the reply did not include it, treat it as optional.
6. Decide how the browser kiosk is authenticated, since a token in a web page is not secret (for example a kiosk login, or a short-lived session started by staff). Deferred from Task 23.

---

## Notes

- Keep this file updated after each weekly discussion exchange.
- Before marking a task complete, re-read its section here and confirm every
  listed commitment is satisfied (or explicitly deferred with a reason).
