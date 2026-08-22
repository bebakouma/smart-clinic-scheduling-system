# Deployment Guide — Smart Clinic Scheduling System

## Overview

This document describes how to deploy the full Smart Clinic Scheduling System as a working demo. The system consists of three services:

- **Frontend** — React SPA served via Nginx (port 5173)
- **Backend** — Node.js/Express API (port 3001)
- **Database** — PostgreSQL 16 (port 5432)

All three services are containerized with Docker and orchestrated via Docker Compose.

## Architecture (Deployed)

```
┌─────────────────────────────────────────────────────┐
│                    Docker Compose                     │
│                                                      │
│  ┌──────────────┐   ┌───────────────┐   ┌────────┐ │
│  │   Frontend   │──▶│    Backend    │──▶│   DB   │  │
│  │  (Nginx:80)  │   │ (Express:3001)│   │(PG:5432│  │
│  │  port: 5173  │   │  port: 3001   │   │        │  │
│  └──────────────┘   └───────────────┘   └────────┘ │
│         │                                            │
│         │ /api/* → proxy to backend:3001             │
│         │ /*     → serve React SPA                   │
└─────────────────────────────────────────────────────┘
         │
    Browser (localhost:5173)
```

## Quick Start (Docker Compose)

```bash
# Clone the repository
git clone https://github.com/bebakouma/smart-clinic-scheduling-system.git
cd smart-clinic-scheduling-system

# Start all services
docker-compose up --build

# In a separate terminal, run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed sample data
docker-compose exec backend node ../scripts/seed.js
```

Then open **http://localhost:5173** in your browser.

## Local Development Setup (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 16 (or Docker for the DB only)

### Step 1: Start the Database

```bash
docker-compose up db
```

### Step 2: Backend Setup

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
npm run dev
```

Backend runs on **http://localhost:3001**.

### Step 3: Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173** with API proxy to backend.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/smart_clinic` | PostgreSQL connection string |
| `PORT` | `3001` | Express server port |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secret key for JWT signing |

### Frontend

No environment variables required — the Vite proxy handles API routing in development, and Nginx handles it in production.

## Docker Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates all three services |
| `backend/Dockerfile` | Builds the backend container (Node.js + Prisma) |
| `frontend/Dockerfile` | Multi-stage build: Vite → Nginx |
| `frontend/nginx.conf` | Nginx config proxying `/api/*` to backend |

## Demo Walkthrough

Once running, the system provides:

1. **Dashboard** (/) — Summary cards showing today's appointments, upcoming count, cancelled, no-shows, and active waitlist
2. **Patients** (/patients) — Create, edit, and list patients
3. **Appointments** (/appointments) — Schedule, reschedule, cancel, and change appointment status
4. **Waitlist** (/waitlist) — Add patients to waitlist, view entries
5. **Intake Forms** (/intake) — Submit and view patient intake forms
6. **Reminder Logs** (/reminders) — View generated reminder entries

## Production Considerations

| Area | Current (Demo) | Production |
|------|---------------|------------|
| Authentication | JWT with dev secret | JWT with RS256 + secure secret from vault |
| HTTPS | Not configured | Reverse proxy with SSL cert (Let's Encrypt) |
| Database | Local PostgreSQL | Managed DB (AWS RDS, Azure PostgreSQL) |
| Hosting | Docker Compose locally | Cloud container service (ECS, Cloud Run, Railway) |
| Secrets | `.env` file | Environment variables via cloud provider |
| Monitoring | Console logs | Structured logging + APM (Datadog, New Relic) |
| Backups | None | Automated daily DB snapshots |
