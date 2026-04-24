# Architecture

## Overview

The Smart Clinic Scheduling System uses a three-tier architecture:

1. **Frontend** (React + Tailwind CSS) — Single-page application served by Vite
2. **Backend** (Node.js + Express) — RESTful API with layered architecture
3. **Database** (PostgreSQL) — Relational data store accessed via Prisma ORM

## Backend Layers

- **Routes** — Define HTTP endpoints and wire validation middleware
- **Validators** — Joi schemas for request body validation
- **Controllers** — Parse requests, call services, format responses
- **Services** — Business logic (validation rules, waitlist matching, reminder generation)
- **Repositories** — Thin Prisma wrappers for database access

## Data Flow

```
Client → Routes → Validator → Controller → Service → Repository → Prisma → PostgreSQL
```

## Key Design Decisions

- Layered architecture for separation of concerns
- Joi for declarative request validation
- Prisma for type-safe database access
- Simulated reminders (DB logging) instead of real email/SMS for prototype
- Rules-based no-show scoring instead of ML for capstone simplicity
