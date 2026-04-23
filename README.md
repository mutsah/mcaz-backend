# MCAZ - Medicines Control Authority of Zimbabwe Backend

NestJS backend for the medicine registration workflow used by MCAZ - Medicines Control Authority of Zimbabwe. The system keeps the existing JWT and OTP authentication flow and replaces the old microloan and KYC domain with medicine application capture, approval, rejection, reporting, and audit tracking.

## Features

- OTP-based user registration and login
- Role-based access control for `USER` and `ADMIN`
- Capture medicine applications with default `PENDING` status
- Approve or reject pending applications
- Automatic deletion of pending applications older than 5 days
- Full status history per application
- Tracking report by date range
- Request-level audit trail for admin review

## Core Domain

Each medicine application stores:

- Generic name
- Strength
- Dosage form: `INJECTION`, `ORAL`, `EXTERNAL`, `VAGINAL`
- Registration number generated automatically in the format `ZIM0001S` (unique)
- Country of origin
- Date captured
- Captured by
- Date approved
- Approved by
- Expiry date set to 3 years from capture date
- Application status: `PENDING`, `APPROVED`, `REJECTED`

## Tech Stack

- NestJS
- Prisma ORM
- PostgreSQL
- JWT authentication
- Nodemailer for OTP email delivery
- Swagger/OpenAPI

## Environment Variables

Create a `.env` file with at least the following values:

```dotenv
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/mcaz

JWT_SECRET=your-access-token-secret
JWT_EXPIRES_IN=900
JWT_REFRESH_SECRET=your-refresh-token-secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password-or-app-password
SMTP_FROM=your-email@example.com

TX_MAX_WAIT_MS=10000
TX_TIMEOUT_MS=30000
ALLOWED_ORIGINS=http://localhost:5173
```

## Installation

```bash
npm install
```

## Database Setup

Generate Prisma client:

```bash
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate dev
```

If your shell has a stale `DATABASE_URL`, set it inline before migrating:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/mcaz"
npx prisma migrate dev --name your_migration_name
```

## Run the Application

```bash
# development
npm run start:dev

# production build
npm run build
npm run start:prod
```

## Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## API Access

- Base URL: `http://localhost:3001/api`
- Swagger docs: `http://localhost:3001/api/docs`

Main route groups:

- `/api/auth`
- `/api/drugs`
- `/api/users`
- `/api/audit-trail`

## Status Lifecycle

1. A user captures a medicine application.
2. The application is stored with status `PENDING`.
3. An admin approves or rejects the application.
4. Every status change is recorded in `drug_status_history`.
5. Pending applications older than 5 days are automatically deleted by the scheduler.

## Reporting

The tracking report endpoint allows admins to fetch applications within a date range together with their current status and full status history.

## Notes

- `AuthModule` is preserved from the previous system.
- The old KYC, loans, and upload modules are no longer part of the application.
- Audit trail logging still records all HTTP activity separately from medicine status history.
