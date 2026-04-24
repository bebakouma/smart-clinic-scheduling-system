# Requirements Document

## Introduction

This document defines the requirements for a Smart Clinic Appointment and Scheduling System — a capstone prototype for a small outpatient clinic. The system helps reduce missed appointments, improve scheduling workflows, support waitlist handling, collect patient intake information, and provide a staff dashboard. Version 1 focuses on the core MVP features using a full-stack JavaScript stack (React, Node.js/Express, PostgreSQL, Prisma).

## Glossary

- **System**: The Smart Clinic Appointment and Scheduling System backend and frontend application
- **Patient**: An individual registered in the system who receives clinic services
- **Appointment**: A scheduled visit between a Patient and a provider at a specific date and time
- **Provider**: A clinic staff member (doctor, nurse practitioner) who sees patients
- **Waitlist_Entry**: A record indicating a Patient desires an appointment slot matching certain criteria
- **Intake_Form**: A pre-visit questionnaire submitted by a Patient for a specific Appointment
- **Reminder**: A simulated notification (logged to the database) sent to a Patient about an upcoming Appointment
- **Dashboard**: A staff-facing view summarizing clinic scheduling activity
- **Appointment_Status**: One of: `scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`
- **Risk_Score**: A rules-based numeric score indicating the likelihood a Patient will miss an Appointment

## Requirements

### Requirement 1: Patient Management

**User Story:** As a clinic staff member, I want to manage patient records, so that I can associate patients with appointments and contact them.

#### Acceptance Criteria

1. WHEN a staff member submits a valid patient form, THE System SHALL create a new Patient record with first name, last name, date of birth, phone, email, and preferred contact method
2. WHEN a staff member requests a list of patients, THE System SHALL return all Patient records
3. WHEN a staff member requests a specific Patient by ID, THE System SHALL return that Patient's details
4. WHEN a staff member updates a Patient record, THE System SHALL persist the changes and return the updated record
5. WHEN a staff member deletes a Patient record, THE System SHALL remove the Patient from the system
6. IF a patient form is submitted with missing required fields (first name, last name, date of birth), THEN THE System SHALL reject the submission and return a descriptive validation error

### Requirement 2: Appointment Scheduling

**User Story:** As a clinic staff member, I want to create and manage appointments, so that patients can be seen by providers at scheduled times.

#### Acceptance Criteria

1. WHEN a staff member submits a valid appointment form with a patient ID, provider name, appointment type, date/time, and optional notes, THE System SHALL create a new Appointment with status `scheduled`
2. WHEN a staff member requests all appointments, THE System SHALL return the list of Appointments with optional filtering by status and date range
3. WHEN a staff member requests a specific Appointment by ID, THE System SHALL return that Appointment's details including the associated Patient information
4. IF an appointment form is submitted with a date/time in the past, THEN THE System SHALL reject the submission and return a validation error
5. IF an appointment form is submitted with a non-existent patient ID, THEN THE System SHALL reject the submission and return a validation error

### Requirement 3: Appointment Rescheduling

**User Story:** As a clinic staff member, I want to reschedule appointments, so that patients can move their visit to a different time without losing their booking.

#### Acceptance Criteria

1. WHEN a staff member updates an Appointment's date/time, THE System SHALL persist the new date/time and retain all other Appointment details
2. IF a reschedule request specifies a date/time in the past, THEN THE System SHALL reject the update and return a validation error
3. IF a reschedule request targets a cancelled or completed Appointment, THEN THE System SHALL reject the update and return an error indicating the Appointment cannot be modified

### Requirement 4: Appointment Cancellation

**User Story:** As a clinic staff member, I want to cancel appointments, so that the clinic can free up slots and trigger waitlist processing.

#### Acceptance Criteria

1. WHEN a staff member cancels an Appointment, THE System SHALL set the Appointment status to `cancelled`
2. WHEN an Appointment is cancelled, THE System SHALL trigger waitlist processing to find matching Waitlist_Entry records
3. IF a cancellation request targets an Appointment that is already cancelled or completed, THEN THE System SHALL reject the request and return an error

### Requirement 5: Appointment Status Tracking

**User Story:** As a clinic staff member, I want to update and track appointment statuses, so that I can monitor the progress of each visit.

#### Acceptance Criteria

1. WHEN a staff member updates an Appointment status, THE System SHALL validate that the new status is one of the allowed Appointment_Status values
2. WHEN an Appointment status is updated, THE System SHALL persist the change and return the updated Appointment
3. IF an invalid status value is provided, THEN THE System SHALL reject the update and return a validation error listing the allowed values

### Requirement 6: Reminder Logic

**User Story:** As a clinic staff member, I want the system to generate appointment reminders, so that patients are notified about upcoming visits and no-shows are reduced.

#### Acceptance Criteria

1. WHEN the reminder process runs, THE System SHALL identify all Appointments scheduled within the next 24 hours that have not already received a reminder
2. WHEN a reminder is generated for an Appointment, THE System SHALL create a Reminder log entry with the appointment ID, patient ID, reminder type, status, and a simulated message
3. WHILE an Appointment has status `cancelled`, THE System SHALL skip reminder generation for that Appointment
4. WHEN a staff member requests reminder logs, THE System SHALL return all Reminder records with filtering support

### Requirement 7: Waitlist Support

**User Story:** As a clinic staff member, I want to manage a waitlist, so that patients waiting for openings can be matched to cancelled slots.

#### Acceptance Criteria

1. WHEN a staff member adds a patient to the waitlist with a requested appointment type, preferred date, and preferred time range, THE System SHALL create a new Waitlist_Entry with status `waiting`
2. WHEN an Appointment is cancelled, THE System SHALL search for Waitlist_Entry records matching the cancelled Appointment's type and date
3. WHEN a matching Waitlist_Entry is found, THE System SHALL mark the first matching entry as `notified` and record the notification timestamp
4. WHEN a staff member requests the waitlist, THE System SHALL return all Waitlist_Entry records with their current status
5. IF no matching Waitlist_Entry exists for a cancelled Appointment, THEN THE System SHALL complete the cancellation without waitlist notification

### Requirement 8: Patient Intake Form

**User Story:** As a patient, I want to submit pre-visit information, so that the clinic has my medical details before my appointment.

#### Acceptance Criteria

1. WHEN a patient submits an intake form with reason for visit, insurance provider, insurance member ID, allergies, medications, emergency contact name, emergency contact phone, and optional notes, THE System SHALL create an Intake_Form record linked to the Patient and Appointment
2. WHEN a staff member requests an intake form by appointment ID, THE System SHALL return the associated Intake_Form details
3. WHEN a staff member updates an intake form, THE System SHALL persist the changes and return the updated record
4. IF an intake form is submitted for a non-existent Appointment, THEN THE System SHALL reject the submission and return a validation error

### Requirement 9: Staff Dashboard

**User Story:** As a clinic staff member, I want a dashboard view, so that I can see a summary of today's appointments, upcoming appointments, cancellations, no-shows, and waitlist activity.

#### Acceptance Criteria

1. WHEN a staff member requests the dashboard summary, THE System SHALL return counts of today's appointments, upcoming appointments, cancelled appointments, no-shows, and active waitlist entries
2. WHEN a staff member requests today's appointments, THE System SHALL return all Appointments scheduled for the current date
3. WHEN a staff member requests no-show information, THE System SHALL return all Appointments with status `no_show`

### Requirement 10: Data Validation and Error Handling

**User Story:** As a developer, I want consistent validation and error handling, so that the API returns predictable and descriptive error responses.

#### Acceptance Criteria

1. THE System SHALL validate all incoming request bodies against defined schemas before processing
2. WHEN validation fails, THE System SHALL return a 400 status code with a JSON body containing the field-level error details
3. WHEN a requested resource is not found, THE System SHALL return a 404 status code with a descriptive message
4. IF an unexpected server error occurs, THEN THE System SHALL return a 500 status code and log the error details without exposing internal information to the client

### Requirement 11: Data Serialization

**User Story:** As a developer, I want all API responses to follow a consistent JSON format, so that the frontend can reliably parse responses.

#### Acceptance Criteria

1. THE System SHALL serialize all API success responses as JSON with a consistent envelope structure containing a `data` field
2. THE System SHALL serialize all API error responses as JSON with a consistent envelope structure containing an `error` field with `message` and `details`
3. FOR ALL valid domain objects, serializing to JSON and then deserializing back SHALL produce an equivalent object (round-trip property)
