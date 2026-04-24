# Database Design

## Tables

### patients
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| first_name | VARCHAR | Required |
| last_name | VARCHAR | Required |
| date_of_birth | TIMESTAMP | Required |
| phone | VARCHAR | Optional |
| email | VARCHAR | Optional |
| preferred_contact_method | VARCHAR | Default: 'email' |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

### appointments
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| patient_id | INT FK | References patients.id |
| provider_name | VARCHAR | Required |
| appointment_type | VARCHAR | Required |
| appointment_datetime | TIMESTAMP | Required, must be future |
| status | VARCHAR | Default: 'scheduled' |
| confirmation_status | VARCHAR | Optional |
| notes | TEXT | Optional |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

### reminder_logs
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| appointment_id | INT FK | References appointments.id |
| patient_id | INT FK | References patients.id |
| reminder_type | VARCHAR | email/phone/sms |
| sent_at | TIMESTAMP | Auto |
| status | VARCHAR | sent/failed |
| message | TEXT | Simulated message content |

### waitlist_entries
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| patient_id | INT FK | References patients.id |
| requested_appointment_type | VARCHAR | Required |
| preferred_date | TIMESTAMP | Optional |
| preferred_time_range | VARCHAR | Optional |
| status | VARCHAR | Default: 'waiting' |
| notified_at | TIMESTAMP | Set when notified |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

### intake_forms
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto-increment |
| patient_id | INT FK | References patients.id |
| appointment_id | INT FK UNIQUE | References appointments.id |
| reason_for_visit | TEXT | Required |
| insurance_provider | VARCHAR | Optional |
| insurance_member_id | VARCHAR | Optional |
| allergies | TEXT | Optional |
| medications | TEXT | Optional |
| emergency_contact_name | VARCHAR | Optional |
| emergency_contact_phone | VARCHAR | Optional |
| notes | TEXT | Optional |
| submitted_at | TIMESTAMP | Auto |

## Relationships

- Patient → many Appointments
- Patient → many WaitlistEntries
- Patient → many IntakeForms
- Appointment → one IntakeForm
- Appointment → many ReminderLogs
