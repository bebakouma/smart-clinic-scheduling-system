# API Specification

## Base URL

`http://localhost:3000/api`

## Response Format

### Success
```json
{ "data": { ... } }
```

### Error
```json
{ "error": { "message": "...", "details": [...] } }
```

## Endpoints

### Patients
- `GET /patients` — List all patients
- `GET /patients/:id` — Get patient by ID
- `POST /patients` — Create patient (requires: first_name, last_name, date_of_birth)
- `PUT /patients/:id` — Update patient
- `DELETE /patients/:id` — Delete patient

### Appointments
- `GET /appointments` — List appointments (query: status, startDate, endDate)
- `GET /appointments/:id` — Get appointment by ID
- `POST /appointments` — Create appointment (requires: patient_id, provider_name, appointment_type, appointment_datetime)
- `PUT /appointments/:id` — Update appointment
- `PATCH /appointments/:id/status` — Change status (requires: status)
- `DELETE /appointments/:id` — Delete appointment

### Reminders
- `GET /reminders/logs` — Get reminder logs
- `POST /reminders/run` — Run reminder generation

### Waitlist
- `GET /waitlist` — List waitlist entries
- `POST /waitlist` — Add to waitlist (requires: patient_id, requested_appointment_type)
- `PATCH /waitlist/:id/status` — Update waitlist entry status
- `POST /waitlist/process-cancellation` — Manually trigger waitlist matching

### Intake
- `GET /intake/:appointmentId` — Get intake form by appointment
- `POST /intake` — Submit intake form (requires: appointment_id, reason_for_visit)
- `PUT /intake/:id` — Update intake form

### Dashboard
- `GET /dashboard/summary` — Get summary counts
- `GET /dashboard/today` — Get today's appointments
- `GET /dashboard/no-shows` — Get no-show appointments

### Analytics
- `GET /analytics/no-show-risk/:appointmentId` — Get no-show risk score
- `POST /analytics/generate-risk` — Generate risk score
