# Session Notes: Program Plan & Progress Log

This file captures the full planning discussion so work can continue across sessions without losing context. Read this first when resuming.

## The Big Picture

**Project:** Smart Clinic Scheduling System
**Repo:** https://github.com/bebakouma/smart-clinic-scheduling-system.git

The same project is carried across three graduate courses (8 weeks each, 24 weeks total) to a live, deployed capstone.

**End goal:** A live, publicly accessible Smart Clinic Scheduling System where you can log in, schedule/reschedule/cancel appointments, manage waitlists and intake, receive real reminders, and demo an IoT-enabled patient check-in — secured, tested, and deployed.

## Course Arc

| Course | Theme | Weeks | Tasks |
|--------|-------|-------|-------|
| SWE-540 (prior) | MVP build | done | 1–15 |
| SWE-550 | Security | 9–16 | test debt + 16–19 |
| SWE-570 | IoT & Embedded | 17–24 | 20–27 |
| SWE-590 | Capstone (deploy & present) | 25–32 | 28–35 |

## Where We Are Now

- The SWE-540 MVP is built: backend (all modules), frontend (all pages), Docker deployment, 55+ passing tests.
- Previous PR #9 (feature/ui-deployment-planning, Task 6.10) is **merged into main**.
- This week (Week 9) = SWE-550 Milestone 4: Implementation Planning and Backlog Setup.
  - Extended `docs/tasks.md` with tasks 16–35.
  - Created `docs/roadmap.md` with the week-by-week schedule.
  - Fixed stale checkboxes for already-done MVP test tasks (3.2, 3.3, 4.3 and parents).
  - Committed to branch `feature/milestone4-planning` and pushed. PR to be opened manually by the user.

## Important Repo Facts (discovered)

- The old `tasks.md` had stale checkboxes: several "unchecked" test tasks were actually already implemented in code.
- Real remaining MVP test tasks (verified against the code): 6.3, 7.2, 8.2, 8.3, 9.2, 11.1.
- Auth middleware (`authMiddleware`, `requireRole`, `generateToken`) already exists in `backend/src/middleware/auth.js` with 13 unit tests, but is NOT yet wired to routes. There is no User model or login/register yet.
- A stray `package-lock.json` appeared at the repo root — intentionally left uncommitted (unrelated to planning docs).

## Week-by-Week Task Schedule

### SWE-550 — Security (Weeks 9–16)

| Week | Task # | Focus |
|------|--------|-------|
| 9 | Milestone 4 (planning) | Extend backlog + roadmap (this week — no code task) |
| 10 | 6.3 | Waitlist property tests (Property 7 + Property 11) |
| 11 | 7.2 | Reminder property tests (Property 9 + Property 10) |
| 12 | 8.2 + 8.3 | Intake property test (Property 13) + Intake service unit tests |
| 13 | 9.2 + 11.1 | Dashboard property test (Property 12) + serialization property tests (14, 15) — completes MVP test debt |
| 14 | 16 | Auth foundation: User model, bcrypt, register/login, JWT |
| 15 | 17 | Wire auth middleware + RBAC to all routes |
| 16 | 18 + 19 | Security hardening + security test suite |

> Note: two schedule variants were discussed. Variant A treats Week 9 as planning-only (above). Variant B starts implementing Task 6.3 in Week 9. The user leaned toward numbered-task weeks; Week 9 is planning per the Milestone 4 assignment. Adjust pacing as needed.

### SWE-570 — IoT & Embedded (Weeks 17–24)

| Week | Task # | Focus |
|------|--------|-------|
| 17 | 20 | Real notification integration (SendGrid/Twilio) |
| 18 | 21 | Scheduled reminder job (cron) |
| 19 | 22 | Patient check-in endpoint + checked-in state |
| 20 | 23 | Check-in kiosk UI |
| 21 | 24 | Simulated IoT check-in device |
| 22 | 25 | Real-time dashboard updates |
| 23 | 26 | IoT security (device tokens, TLS) |
| 24 | 27 | IoT integration tests + demo |

### SWE-590 — Capstone (Weeks 25–32)

| Week | Task # | Focus |
|------|--------|-------|
| 25 | 28 | Deployment setup (host + managed PostgreSQL) |
| 26 | 29 | Deploy backend + database live |
| 27 | 30 | Deploy frontend live |
| 28 | 31 | Production hardening |
| 29 | 32 | Smart feature: predictive no-show detection or smart triage |
| 30 | 33 | Full end-to-end testing against live environment |
| 31 | 34 | Capstone documentation |
| 32 | 35 | Capstone presentation + final submission |

## Open Decisions (confirm closer to their week)

1. **IoT feature (Course 2):** Recommended — patient self check-in kiosk + real reminders.
2. **Capstone smart feature (Week 29):** Recommended — predictive no-show detection.
3. **Deployment target (Week 25):** Recommended — managed container platform (Render/Railway/Fly.io) + managed PostgreSQL.

## Weekly Discussion-Post Pattern

Each week the user posts: what was accomplished this week + what is planned next week + any blockers. Draft these from the task schedule above.

## How to Resume in a New Session

Say: "continue with smart-clinic-scheduling" and reference this file (`docs/session-notes.md`). Then pick the current week's task from the schedule.

---

## SESSION UPDATE — End of SWE-550 (Security course complete)

### What was accomplished across the SWE-550 course

All work followed the same flow: branch per task, implement, run tests, check off in tasks.md, commit, push. User opens and merges each PR manually.

| Topic/Week | Task | Branch | Status |
|------------|------|--------|--------|
| 1 (DQ2) | no_show provider-conflict bug fix (Loom video) | fix/no-show-conflict | Merged (PR #12) |
| 2 | 6.3 Waitlist property tests | task-7.2... (waitlist) | Merged |
| 3 | 7.2 Reminder property tests | task-7.2-reminder-property-tests | Merged |
| 4 | 8.2 + 8.3 Intake property + unit tests | task-8-intake-tests | Merged |
| 5 | 9.2 + 11.1 Dashboard + serialization property tests | task-9-11-dashboard-serialization-tests | Merged |
| 6 | 16 Auth foundation (User model, bcrypt, register/login, JWT) | task-16-auth-foundation | Pushed (PR open) |
| 7 | 17 Wire auth + RBAC to all routes | task-17-auth-rbac-routes | Pushed (PR open) |
| 7 (final) | 18 Security hardening (rate limit, CORS, body limit, PII-safe logging) | task-18-security-hardening | Pushed (PR open) |

MVP test debt is fully cleared (tasks 6.3, 7.2, 8.2, 8.3, 9.2, 11.1 all done).
Authentication, RBAC, and hardening are all implemented.

### IMPORTANT: Branch merge order
Tasks 16 → 17 → 18 chain on top of each other (each branch was created from the previous).
Merge their PRs in order: 16 first, then 17, then 18. After merging, main will contain all three.

### Known Issues still OPEN
1. **4 aged-out date tests in `backend/tests/unit/appointments.service.test.js`** — hardcoded dates like `2026-07-01`/`2026-08-01` are now in the past, so the service correctly rejects them and the tests fail. Fix: replace with dynamic future dates (`new Date(Date.now() + 14*24*60*60*1000).toISOString()`). Good candidate for a future "fix a bug" assignment, or quick cleanup. NOT related to any recent task.

### Follow-up needed before running live
- Prisma migration for the new `User` model has NOT been run (only `prisma generate`). Run `npx prisma migrate dev` when setting up the DB. This is part of real deployment, not a test task.

## NEXT SESSION STARTS HERE — SWE-570 (IoT & Embedded), starts Oct 22

**First task of the new course: Task 19** (it carries over from the security backlog — it was NOT done in SWE-550).

- **Task 19 — Security test suite:** RBAC tests (401/403), JWT expiry/tamper tests, PII-leak tests (no patient data in responses/logs), input-validation security tests (SQL injection, XSS payload, oversized body, invalid IDs), and run `npm audit` with a dependency risk review.

### Remaining tasks to the end of the program

**SWE-570 — IoT & Embedded (Tasks 19–27)**
- 19 — Security test suite (carryover; first task of this course)
- 20 — Real notification integration (SendGrid/Twilio), replace simulated reminders
- 21 — Scheduled reminder job (node-cron)
- 22 — Patient check-in endpoint + checked_in state (schema migration)
- 23 — Check-in kiosk UI (frontend)
- 24 — Simulated IoT check-in device (standalone script, HTTP/MQTT)
- 25 — Real-time dashboard updates (WebSocket/polling)
- 26 — IoT security (device token/API key, TLS)
- 27 — IoT integration tests + demo

**SWE-590 — Capstone / Deploy & Present (Tasks 28–35)**
- 28 — Deployment setup (host + managed PostgreSQL, prod config)
- 29 — Deploy backend + database live (HTTPS, secrets, migrations)
- 30 — Deploy frontend live, wired to prod API
- 31 — Production hardening (monitoring, smoke tests)
- 32 — Smart feature: predictive no-show detection OR smart triage
- 33 — Full end-to-end testing against live environment
- 34 — Capstone documentation (report + demo script)
- 35 — Capstone presentation + final submission

### Weekly post pattern
Each week: "Last week I did Task X... This week I plan Task Y (next number)... No major blockers." Include task numbers and property names. Keep it natural, short, no big words.

### Open decisions (confirm closer to their week)
1. IoT feature: patient self check-in kiosk + real reminders (recommended).
2. Capstone smart feature: predictive no-show detection (recommended).
3. Deployment target: managed container platform (Render/Railway/Fly.io) + managed PostgreSQL (recommended).
