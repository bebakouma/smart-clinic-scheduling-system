# Project Roadmap: Smart Clinic Scheduling System

This roadmap carries the Smart Clinic Scheduling System from the completed MVP through three courses to a live, deployed capstone. Each week maps to one task number in `docs/tasks.md`.

**End goal:** A live, publicly accessible Smart Clinic Scheduling System where you can log in, schedule/reschedule/cancel appointments, manage waitlists and intake, receive real reminders, and demo an IoT-enabled patient check-in — secured, tested, and deployed.

## Course Overview

| Course | Theme | Weeks | Tasks |
|--------|-------|-------|-------|
| SWE-540 (prior) | MVP build | — | 1–15 |
| SWE-550 | Security | 9–16 | test debt + 16–19 |
| SWE-570 | IoT & Embedded | 17–24 | 20–27 |
| SWE-590 | Capstone (deploy & present) | 25–32 | 28–35 |

## Week-by-Week Schedule

### SWE-550 — Software Engineering & Security Principles

| Week | Task # | Focus |
|------|--------|-------|
| 9 | 6.3 | Waitlist property tests (Property 7 + Property 11) |
| 10 | 7.2 | Reminder property tests (Property 9 + Property 10) |
| 11 | 8.2 + 8.3 | Intake property test (Property 13) + Intake service unit tests |
| 12 | 9.2 + 11.1 | Dashboard property test (Property 12) + serialization property tests (Property 14, 15) — completes MVP test debt |
| 13 | 16 | Authentication foundation: User model, bcrypt, register/login, JWT |
| 14 | 17 | Wire auth middleware + RBAC to all routes |
| 15 | 18 | Security hardening: rate limiting, CORS lockdown, PII-safe logging |
| 16 | 19 | Security test suite: RBAC, JWT, PII-leak, input-validation security |

### SWE-570 — Software Engineering IoT & Embedded Systems

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

### SWE-590 — Software Engineering Capstone

| Week | Task # | Focus |
|------|--------|-------|
| 25 | 28 | Deployment setup (host + managed PostgreSQL) |
| 26 | 29 | Deploy backend + database live |
| 27 | 30 | Deploy frontend live |
| 28 | 31 | Production hardening (monitoring, smoke tests) |
| 29 | 32 | Smart feature: predictive no-show detection or smart triage |
| 30 | 33 | Full end-to-end testing against live environment |
| 31 | 34 | Capstone documentation |
| 32 | 35 | Capstone presentation + final submission |

## Open Decisions

These can be confirmed closer to the relevant week:

1. **IoT feature (Course 2):** Recommended — patient self check-in kiosk + real reminders.
2. **Capstone smart feature (Week 29):** Recommended — predictive no-show detection.
3. **Deployment target (Week 25):** Recommended — managed container platform (Render/Railway/Fly.io) with managed PostgreSQL.
