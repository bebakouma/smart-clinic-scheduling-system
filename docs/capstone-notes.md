# Capstone Notes

## Project Scope

This is a prototype/MVP for a capstone project. It demonstrates:
- Full-stack JavaScript development (React + Node.js + PostgreSQL)
- RESTful API design with proper validation and error handling
- Database design with Prisma ORM
- Business logic implementation (waitlist matching, reminder simulation)
- Clean code architecture (layered backend pattern)

## What This Is NOT

- Not a production healthcare system
- Not HIPAA compliant
- Does not use real email/SMS services
- Does not implement authentication (planned for V2)
- Does not use real ML for no-show prediction

## Version 2 Plans

1. Rules-based no-show prediction scoring
2. User authentication with role-based access
3. Real reminder integration (Twilio/SendGrid)
4. Enhanced reporting and analytics
5. CI/CD pipeline with GitHub Actions
6. Deployment to cloud platform

## Demo Talking Points

- Show patient creation and appointment scheduling flow
- Demonstrate appointment cancellation triggering waitlist notification
- Show dashboard summary with real-time counts
- Explain the layered architecture and separation of concerns
- Discuss the reminder simulation approach and how it would scale to real notifications
