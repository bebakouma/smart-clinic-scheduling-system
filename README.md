# Smart Clinic Appointment and Scheduling System

Capstone prototype for a Smart Clinic Appointment and Scheduling System with scheduling, reminders, waitlist support, patient intake, and future no-show prediction.

## Features

- Patient management (CRUD)
- Appointment scheduling, rescheduling, cancellation, and status tracking
- Simulated reminder system (logged to database)
- Waitlist support with automatic matching on cancellation
- Patient intake form collection
- Staff dashboard with summary statistics
- Rules-based no-show risk scoring (V2)

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Testing**: Jest + Supertest + fast-check

## Running Locally

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)

### Setup

1. Clone the repository
2. Start PostgreSQL:
   ```bash
   docker-compose up -d
   ```
3. Set up the backend:
   ```bash
   cd backend
   cp ../.env.example .env
   npm install
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. Seed the database:
   ```bash
   node ../scripts/seed.js
   ```
5. Start the backend:
   ```bash
   npm run dev
   ```
6. Set up and start the frontend (new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
7. Open http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/patients | List all patients |
| POST | /api/patients | Create patient |
| GET | /api/patients/:id | Get patient |
| PUT | /api/patients/:id | Update patient |
| DELETE | /api/patients/:id | Delete patient |
| GET | /api/appointments | List appointments |
| POST | /api/appointments | Create appointment |
| PUT | /api/appointments/:id | Update appointment |
| PATCH | /api/appointments/:id/status | Change status |
| GET | /api/reminders/logs | View reminder logs |
| POST | /api/reminders/run | Run reminder check |
| GET | /api/waitlist | List waitlist |
| POST | /api/waitlist | Add to waitlist |
| GET | /api/intake/:appointmentId | Get intake form |
| POST | /api/intake | Submit intake form |
| GET | /api/dashboard/summary | Dashboard summary |
| GET | /api/dashboard/today | Today's appointments |

## Planned Improvements

- Real email/SMS reminder integration
- User authentication and role-based access
- Rules-based no-show prediction
- Reporting and analytics dashboard
- CI/CD pipeline with GitHub Actions
