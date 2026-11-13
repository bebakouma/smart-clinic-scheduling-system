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

## Notes

- Keep this file updated after each weekly discussion exchange.
- Before marking a task complete, re-read its section here and confirm every
  listed commitment is satisfied (or explicitly deferred with a reason).
