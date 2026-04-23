# MCAZ - Medicines Control Authority of Zimbabwe API Documentation

**API Base URL:** `http://localhost:3001/api`  
**Swagger UI:** `http://localhost:3001/api/docs`

---

## Table of Contents

1. Authentication
2. Authorization
3. Error Handling
4. Auth Module
5. Drugs Module
6. Users Module
7. Audit Trail Module
8. Enums

---

## Authentication

All endpoints except the public auth routes require a bearer token in the `Authorization` header.

Public routes:

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/login`

Protected routes require:

```http
Authorization: Bearer <access_token>
```

Refresh token route requires the refresh token scheme configured in Swagger.

---

## Authorization

- `USER`: can register, authenticate, manage their profile, and capture or view medicine applications.
- `ADMIN`: can do everything a user can do, plus approve or reject applications, generate reports, list users, and inspect audit logs.

---

## Error Handling

All errors follow this structure:

```json
{
  "message": "Error description",
  "error": "Bad Request|Unauthorized|Forbidden|Not Found|Conflict",
  "statusCode": 400
}
```

Common status codes:

| Code | Meaning                             |
| ---- | ----------------------------------- |
| 200  | Success                             |
| 201  | Created                             |
| 400  | Validation or business rule failure |
| 401  | Missing or invalid authentication   |
| 403  | Authenticated but not authorized    |
| 404  | Resource not found                  |
| 409  | Duplicate resource conflict         |
| 429  | Rate limit exceeded                 |

---

## Auth Module

**Base URL:** `/api/auth`

### POST `/register`

Creates a user account in `PENDING` status and sends a registration OTP.

Request body:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+263771234567",
  "password": "SecurePass@123"
}
```

Rules:

- `email` must be valid and unique
- `phone` must be valid and unique
- `password` must be at least 8 characters and include a letter, number, and special character

Response:

```json
{
  "message": "Registration successful. Verify OTP sent to your email."
}
```

### POST `/verify-otp`

Verifies the registration OTP and activates the account.

Request body:

```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

Response:

```json
{
  "message": "OTP verified. Your account is now active."
}
```

### POST `/resend-otp`

Sends a new registration OTP.

Request body:

```json
{
  "email": "jane@example.com"
}
```

### POST `/login`

Authenticates the user and returns access and refresh tokens.

Request body:

```json
{
  "email": "jane@example.com",
  "password": "SecurePass@123"
}
```

Response shape:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+263771234567",
    "role": "USER",
    "status": "PENDING"
  }
}
```

### POST `/refresh`

Requires a valid refresh token and returns a fresh auth payload.

### POST `/logout`

Requires an access token and invalidates the stored refresh token.

---

## Drugs Module

**Base URL:** `/api/drugs`

This module replaces the old KYC and loans workflow.

### POST `/`

Captures a new medicine application. The status is always created as `PENDING`.

Request body:

```json
{
  "genericName": "Amoxicillin",
  "strength": "500mg",
  "dosageForm": "ORAL",
  "countryOfOrigin": "Zimbabwe"
}
```

Rules:

- `registrationNumber` is generated automatically by the system in format `ZIM` + 4 digits + 1 uppercase letter
- `dosageForm` must be one of `INJECTION`, `ORAL`, `EXTERNAL`, `VAGINAL`
- `expiryDate` is calculated automatically as 3 years from the capture date
- Responses include `capturedByUser` and `approvedByUser` profile objects for clear accountability
- A first status history row is created automatically with `PENDING`
- Each status history row includes the status-change timestamp, the responsible user id, and the responsible user profile details in `changedByUser`

### GET `/`

Lists medicine applications. Use query parameters to show one category at a time.

Supported query parameters:

- `status`: `PENDING`, `APPROVED`, `REJECTED`
- `from`: ISO date string
- `to`: ISO date string
- `page`: integer, default `1`
- `limit`: integer, default `20`, max `100`

Example:

```http
GET /api/drugs?status=PENDING&page=1&limit=20
```

Pending applications include `daysInPending` in the response.

### GET `/report`

Admin-only tracking report for applications processed within a required date range.

Required query parameters:

- `from`
- `to`

Optional query parameters:

- `status`
- `page`
- `limit`

The report filters by status-change timestamps in `statusHistory.createdAt` and returns the current status plus the full status history for each matching application.

### GET `/:id`

Returns one application with its complete status history.

### PATCH `/:id/approve`

Admin-only endpoint to approve a pending application.

Optional request body:

```json
{
  "note": "All submitted details verified"
}
```

Effects:

- sets status to `APPROVED`
- sets `approvedBy`
- sets `dateApproved`
- appends a new status history record

### PATCH `/:id/reject`

Admin-only endpoint to reject a pending application.

Optional request body:

```json
{
  "note": "Registration number format invalid"
}
```

Effects:

- sets status to `REJECTED`
- sets `approvedBy`
- sets `dateApproved`
- appends a new status history record

### Automatic Cleanup

Pending applications older than 5 days are deleted automatically by a scheduled job that runs daily at midnight.

---

## Users Module

**Base URL:** `/api/users`

### GET `/me`

Returns the authenticated user profile.

### PUT `/me`

Updates the authenticated user profile.

Request body:

```json
{
  "firstName": "Jane",
  "lastName": "Dube",
  "phone": "+263771111111"
}
```

### GET `/admin/list`

Admin-only endpoint to list users.

Supported query parameters:

- `page`: default `1`
- `limit`: default `10`, max `100`

---

## Audit Trail Module

**Base URL:** `/api/audit-trail`

### GET `/admin/list`

Admin-only endpoint for request audit logs.

Supported query parameters:

- `page`: default `1`
- `limit`: default `20`, max `100`
- `method`: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- `statusCode`: integer from `100` to `599`
- `actorId`: user id
- `search`: searches path, action, actor email, and actor name
- `from`: ISO date string
- `to`: ISO date string

Audit log entries include actor, method, path, action, status code, response time, IP address, user agent, metadata, and timestamp.

---

## Enums

### Role

- `USER`
- `ADMIN`

### UserStatus

- `PENDING`
- `VERIFIED`

### DosageForm

- `INJECTION`
- `ORAL`
- `EXTERNAL`
- `VAGINAL`

### ApplicationStatus

- `PENDING`
- `APPROVED`
- `REJECTED`
