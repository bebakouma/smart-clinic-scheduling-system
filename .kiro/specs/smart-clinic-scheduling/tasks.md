# Implementation Plan: Smart Clinic Scheduling System

## Overview

This plan implements the Smart Clinic Scheduling System MVP using React, Node.js/Express, PostgreSQL, and Prisma. Tasks are ordered so each step builds on the previous one, with no orphaned code. Property-based tests use fast-check, unit/integration tests use Jest + Supertest. All tasks including tests are required.

## Tasks

- [x] 1. Initialize project structure and configure backend
  - Create `backend/package.json` with Express, Prisma, Joi, cors, dotenv dependencies
  - Create `backend/src/app.js` with Express app setup, JSON parsing, CORS, and route mounting
  - Create `backend/src/server.js` entry point
  - Create `backend/src/middleware/errorHandler.js` global error handler returning JSON error envelope
  - Create `backend/src/middleware/responseEnvelope.js` helper for wrapping success responses in `{ data: ... }`
  - Create `.env.example` with DATABASE_URL placeholder
  - Create `docker-compose.yml` with PostgreSQL service
  - _Requirements: 10.1, 10.4, 11.1, 11.2_

- [x] 2. Define Prisma schema and generate client
  - Create `backend/prisma/schema.prisma` with Patient, Appointment, ReminderLog, WaitlistEntry, IntakeForm models as defined in the design
  - Run `npx prisma generate` to generate the Prisma client
  - Create `backend/src/config/database.js` exporting a shared PrismaClient instance
  - _Requirements: All data model requirements_

- [ ] 3. Implement Patient module
  - [x] 3.1 Create patient repository, service, validator, controller, and routes
    - `backend/src/repositories/patients.repository.js` — Prisma CRUD operations
    - `backend/src/services/patients.service.js` — required field validation, delegates to repository
    - `backend/src/validators/patients.validator.js` — Joi schema for create/update
    - `backend/src/controllers/patients.controller.js` — request handling with response envelope
    - `backend/src/routes/patients.routes.js` — wire GET, POST, PUT, DELETE endpoints
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 3.2 Write property tests for Patient module
    - **Property 1: Patient creation round-trip**
    - **Validates: Requirements 1.1, 1.3**
    - **Property 2: Patient required field validation**
    - **Validates: Requirements 1.6**

  - [ ] 3.3 Write unit tests for Patient service
    - Test required field validation logic
    - Test edge cases: empty strings, missing fields
    - _Requirements: 1.1, 1.6_

- [ ] 4. Implement Appointment module
  - [x] 4.1 Create appointment repository, service, validator, controller, and routes
    - `backend/src/repositories/appointments.repository.js` — Prisma CRUD with filtering
    - `backend/src/services/appointments.service.js` — future date validation, status transitions, patient existence check
    - `backend/src/validators/appointments.validator.js` — Joi schemas for create/update/status
    - `backend/src/controllers/appointments.controller.js` — request handling
    - `backend/src/routes/appointments.routes.js` — wire GET, POST, PUT, PATCH, DELETE endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.3, 5.1, 5.2, 5.3_

  - [x] 4.2 Write property tests for Appointment module
    - **Property 3: Appointment creation defaults to scheduled**
    - **Validates: Requirements 2.1**
    - **Property 4: Past date rejection**
    - **Validates: Requirements 2.4, 3.2**
    - **Property 5: Reschedule preserves non-date fields**
    - **Validates: Requirements 3.1**
    - **Property 6: Terminal status appointments cannot be modified**
    - **Validates: Requirements 3.3, 4.3**
    - **Property 8: Status update validation and persistence**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ] 4.3 Write unit tests for Appointment service
    - Test future date validation
    - Test status transition logic
    - Test patient existence check
    - _Requirements: 2.4, 3.3, 5.1_

- [ ] 5. Checkpoint - Ensure patient and appointment modules work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Waitlist module
  - [x] 6.1 Create waitlist repository, service, validator, controller, and routes
    - `backend/src/repositories/waitlist.repository.js` — Prisma CRUD with matching query
    - `backend/src/services/waitlist.service.js` — add entry, match on cancellation (by type and date, oldest first)
    - `backend/src/validators/waitlist.validator.js` — Joi schema for waitlist entry
    - `backend/src/controllers/waitlist.controller.js` — request handling
    - `backend/src/routes/waitlist.routes.js` — wire GET, POST, PATCH endpoints
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.2 Integrate waitlist processing into appointment cancellation
    - Update `appointments.service.js` to call `waitlist.service.processCancellation()` when an appointment is cancelled
    - _Requirements: 4.2, 7.2, 7.3_

  - [ ] 6.3 Write property tests for Waitlist module
    - **Property 7: Cancellation sets status and triggers waitlist**
    - **Validates: Requirements 4.1, 4.2, 7.3**
    - **Property 11: Waitlist entry creation defaults to waiting**
    - **Validates: Requirements 7.1**

  - [x] 6.4 Write unit tests for Waitlist service
    - Test matching logic: type match, date match, oldest-first selection
    - Test no-match scenario
    - _Requirements: 7.2, 7.3, 7.5_

- [ ] 7. Implement Reminder module
  - [x] 7.1 Create reminder repository, service, controller, and routes
    - `backend/src/repositories/reminders.repository.js` — Prisma queries for reminder_logs
    - `backend/src/services/reminders.service.js` — find eligible appointments (within 24h, not cancelled, not already reminded), create log entries
    - `backend/src/controllers/reminders.controller.js` — request handling
    - `backend/src/routes/reminders.routes.js` — wire GET, POST endpoints
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 7.2 Write property tests for Reminder module
    - **Property 9: Reminder eligibility filtering**
    - **Validates: Requirements 6.1, 6.3**
    - **Property 10: Reminder log completeness**
    - **Validates: Requirements 6.2**

  - [ ] 7.3 Write unit tests for Reminder service
    - Test 24-hour window filtering
    - Test cancelled appointment exclusion
    - Test duplicate reminder prevention
    - _Requirements: 6.1, 6.3_

- [ ] 8. Implement Intake module
  - [x] 8.1 Create intake repository, service, validator, controller, and routes
    - `backend/src/repositories/intake.repository.js` — Prisma CRUD
    - `backend/src/services/intake.service.js` — validate appointment exists, link to patient
    - `backend/src/validators/intake.validator.js` — Joi schema for intake form
    - `backend/src/controllers/intake.controller.js` — request handling
    - `backend/src/routes/intake.routes.js` — wire GET, POST, PUT endpoints
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 8.2 Write property tests for Intake module
    - **Property 13: Intake form round-trip**
    - **Validates: Requirements 8.1, 8.2**

  - [ ] 8.3 Write unit tests for Intake service
    - Test appointment existence validation
    - Test intake form creation and retrieval
    - _Requirements: 8.1, 8.4_

- [ ] 9. Implement Dashboard module
  - [x] 9.1 Create dashboard service, controller, and routes
    - `backend/src/services/dashboard.service.js` — aggregate counts: today's appointments, upcoming, cancelled, no-shows, active waitlist
    - `backend/src/controllers/dashboard.controller.js` — request handling
    - `backend/src/routes/dashboard.routes.js` — wire GET endpoints
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 9.2 Write property tests for Dashboard module
    - **Property 12: Dashboard summary accuracy**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 10. Checkpoint - Ensure all backend modules work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Write serialization property tests
  - [ ] 11.1 Write property tests for API envelope and serialization
    - **Property 14: API response envelope consistency**
    - **Validates: Requirements 11.1, 11.2**
    - **Property 15: Domain object JSON serialization round-trip**
    - **Validates: Requirements 11.3**

- [x] 12. Initialize frontend application
  - Create React app in `frontend/` with Vite
  - Install Tailwind CSS, React Router, and configure base layout
  - Create `frontend/src/services/api.js` base fetch wrapper
  - Create shared layout component with sidebar navigation
  - _Requirements: All frontend-related_

- [ ] 13. Implement frontend pages
  - [x] 13.1 Create Dashboard page
    - Display summary cards (today, upcoming, cancelled, no-shows, waitlist count)
    - Display today's appointment list
    - Fetch from `/api/dashboard/summary` and `/api/dashboard/today`
    - _Requirements: 9.1, 9.2_

  - [x] 13.2 Create Patients page
    - Patient list table with create/edit modal
    - Fetch from `/api/patients`, POST/PUT for create/update
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 13.3 Create Appointments page
    - Appointment list with status/date filters
    - Create, reschedule, cancel, and status-change actions
    - Fetch from `/api/appointments`
    - _Requirements: 2.1, 2.2, 3.1, 4.1, 5.1_

  - [x] 13.4 Create Waitlist page
    - Waitlist entries table with add-to-waitlist form
    - Fetch from `/api/waitlist`
    - _Requirements: 7.1, 7.4_

  - [x] 13.5 Create Intake Form page
    - Intake submission form linked to an appointment
    - Fetch from `/api/intake`
    - _Requirements: 8.1, 8.2_

  - [x] 13.6 Create Reminder Logs page
    - Read-only table of reminder log entries
    - Fetch from `/api/reminders/logs`
    - _Requirements: 6.4_

- [x] 14. Create seed script and finalize
  - Create `scripts/seed.js` to populate database with sample patients, appointments, waitlist entries, and intake forms
  - Create `README.md` with project description, tech stack, setup instructions, and feature list
  - _Requirements: All_

- [ ] 15. Final checkpoint - Full system verification
  - Ensure all tests pass, ask the user if questions arise.
