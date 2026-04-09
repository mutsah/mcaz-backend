# Microloan Backend API Documentation

**API Base URL:** `http://localhost:3001/api`  
**API Docs (Swagger):** `http://localhost:3001/api/docs`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Error Handling](#error-handling)
4. [Auth Module](#auth-module)
5. [KYC Module](#kyc-module)
6. [Loans Module](#loans-module)
7. [Users Module](#users-module)
8. [Audit Trail Module](#audit-trail-module)
9. [Enums](#enums)

---

## Authentication

All endpoints (except `register`, `verify-otp`, `resend-otp`, `login`) require a **Bearer JWT token** in the `Authorization` header.

### Token Types

- **Access Token:** Short-lived (15 minutes). Use for API requests.
- **Refresh Token:** Long-lived (7 days). Use to get a new access token when it expires.

### Token Storage (React Best Practices)

```javascript
// Store tokens securely
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// Use in every authenticated request
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
}
```

---

## Authorization

- **USER role:** Can use auth, kyc, loans, and user profile endpoints.
- **ADMIN role:** Can review KYC submissions, approve/reject loans, manage admin user views, and inspect audit trail activity.

## Audit Logging

- All HTTP requests are recorded in the audit trail store.
- Sensitive request fields such as passwords, OTPs, tokens, and secrets are redacted before persistence.
- Audit records include actor, method, path, status code, response time, IP address, user agent, and sanitized request metadata.
- Audit trail viewing is restricted to admins.

---

## Error Handling

All errors follow this format:

```json
{
  "message": "Error description",
  "error": "Bad Request|Unauthorized|Forbidden|Not Found|Conflict",
  "statusCode": 400
}
```

### Common Status Codes

| Code | Meaning                                                          |
| ---- | ---------------------------------------------------------------- |
| 200  | Success                                                          |
| 201  | Created                                                          |
| 400  | Bad Request (validation or business logic error)                 |
| 401  | Unauthorized (missing/invalid token)                             |
| 403  | Forbidden (insufficient permissions or blocked by business rule) |
| 404  | Not Found                                                        |
| 409  | Conflict (duplicate email/phone)                                 |
| 429  | Too Many Requests (rate limited)                                 |

---

## Auth Module

**Base URL:** `/api/auth`

### 1. Register

**POST** `/register`

Creates a new user account and sends registration OTP to email.

#### Request DTO

```typescript
{
  "firstName": string;        // Required. Min 1 char
  "lastName": string;         // Required. Min 1 char
  "email": string;            // Required. Valid email, must be unique
  "phone": string;            // Required. Valid international phone, must be unique (e.g., +263771234567)
  "password": string;         // Required. Min 8 chars, must have letter, number, special char
}
```

#### Response

```json
{
  "message": "Registration successful. Verify OTP sent to your email."
}
```

#### Error Cases

- **409 Conflict:** Email or phone already exists
- **400 Bad Request:** OTP email send failed (with specific error message)

#### Example

**cURL:**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+263771234567",
    "password": "SecurePass@123"
  }'
```

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+263771234567',
    password: 'SecurePass@123',
  }),
});
```

---

### 2. Verify OTP

**POST** `/verify-otp`

Verifies the registration OTP and activates the user account.

#### Request DTO

```typescript
{
  "email": string;   // Required. The email used during registration
  "otp": string;     // Required. 6-digit code sent via email
}
```

#### Response

```json
{
  "message": "OTP verified. Your account is now active."
}
```

#### Error Cases

- **400 Bad Request:** Invalid OTP, expired OTP, or OTP attempts exceeded
- **404 Not Found:** User not found

#### Example

**cURL:**

```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "otp": "123456"
  }'
```

---

### 3. Resend OTP

**POST** `/resend-otp`

Resends a new registration OTP to the email address.

#### Request DTO

```typescript
{
  "email": string;   // Required. Valid email
}
```

#### Response

```json
{
  "message": "A new OTP has been sent."
}
```

#### Error Cases

- **400 Bad Request:** User already verified or OTP email failed
- **404 Not Found:** User not found

---

### 4. Login

**POST** `/login`

Authenticates the user and returns access + refresh tokens.

#### Request DTO

```typescript
{
  "email": string;    // Required. Valid email
  "password": string; // Required
}
```

#### Response DTO

```typescript
{
  "accessToken": string;    // JWT token (use in Authorization header)
  "refreshToken": string;   // JWT token (store securely for token refresh)
  "user": {
    "id": string;
    "email": string;
    "firstName": string;
    "lastName": string;
    "phone": string;
    "role": "USER" | "ADMIN";
    "status": "PENDING" | "VERIFIED";
  }
}
```

#### Error Cases

- **401 Unauthorized:** Invalid email or password
- **403 Forbidden:** Account not verified (user must complete OTP verification first)
- **429 Too Many Requests:** Rate limit exceeded

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'jane@example.com',
    password: 'SecurePass@123',
  }),
});
const data = await response.json();
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
localStorage.setItem('user', JSON.stringify(data.user));
```

---

### 5. Refresh Tokens

**POST** `/refresh`

Generates a new access token using the refresh token.

#### Headers

```
Authorization: Bearer <REFRESH_TOKEN>
```

#### Response DTO

Same as [Login response](#response-dto)

#### Error Cases

- **401 Unauthorized:** Invalid or expired refresh token
- **429 Too Many Requests:** Rate limit exceeded

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/auth/refresh', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('refreshToken')}`,
  },
});
const data = await response.json();
localStorage.setItem('accessToken', data.accessToken);
```

---

### 6. Logout

**POST** `/logout`

Invalidates the current user's refresh token.

#### Headers

```
Authorization: Bearer <ACCESS_TOKEN>
```

#### Response

```json
{}
```

---

## KYC Module

**Base URL:** `/api/kyc`

**Authentication:** Required for all endpoints

### 1. Submit KYC

**POST** `/submit`

Submits KYC document URLs for identity verification. The frontend handles file uploads and sends back the URLs.

#### Request DTO

```typescript
{
  "documentType": "NATIONAL_ID" | "PASSPORT";  // Required
  "frontFileUrl": string;                       // Required. URL to front document
  "backFileUrl": string;                        // Optional. URL to back document
}
```

#### Response

```json
{
  "id": "uuid",
  "userId": "uuid",
  "documentType": "NATIONAL_ID" | "PASSPORT",
  "frontFilePath": "https://storage.example.com/kyc/front-doc.jpg",
  "backFilePath": "https://storage.example.com/kyc/back-doc.jpg | null",
  "status": "SUBMITTED",
  "reviewedBy": null,
  "rejectionNote": null,
  "createdAt": "2026-04-08T18:00:00Z",
  "updatedAt": "2026-04-08T18:00:00Z"
}
```

#### Error Cases

- **400 Bad Request:** Invalid URL format

#### Example

**React:**

```javascript
// After frontend uploads file to cloud storage and gets URL
const response = await fetch('http://localhost:3001/api/kyc/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
  body: JSON.stringify({
    documentType: 'NATIONAL_ID',
    frontFileUrl: 'https://storage.example.com/kyc/12345-front.jpg',
    backFileUrl: 'https://storage.example.com/kyc/12345-back.jpg',
  }),
});
```

---

### 4. Get KYC Status

**GET** `/status`

Retrieves all KYC submissions for the current user.

#### Response

Array of KYC submission objects (same as Submit response)

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/kyc/status', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});
const submissions = await response.json();
```

---

### 3. Get KYC File

**GET** `/file/:id/:side`

Retrieves the URL of a KYC document.

#### URL Parameters

- `id` (string): KYC submission ID
- `side` (string): `front` or `back`

#### Response

```json
{
  "url": "https://storage.example.com/kyc/front-doc.jpg"
}
```

#### Example

**React:**

```javascript
const response = await fetch(
  `http://localhost:3001/api/kyc/file/${kycId}/front`,
  {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
  },
);
const data = await response.json();
const imageUrl = data.url;
```

---

### 5. Get KYC Admin Queue (Admin Only)

**GET** `/admin/queue?page=1&limit=10`

Retrieves all pending KYC submissions for admin review.

#### Query Parameters

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

#### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "documentType": "NATIONAL_ID",
      "frontFilePath": "string",
      "backFilePath": "string | null",
      "status": "SUBMITTED",
      "reviewedBy": null,
      "rejectionNote": null,
      "createdAt": "2026-04-08T18:00:00Z",
      "updatedAt": "2026-04-08T18:00:00Z",
      "user": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@example.com",
        "phone": "+263771234567"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 50,
  "totalPages": 5
}
```

#### Error Cases

- **403 Forbidden:** User is not an admin

---

### 6. Get KYC Detail by ID (Admin Only)

**GET** `/admin/:id`

Retrieves full details of a specific KYC submission.

#### URL Parameters

- `id` (string): KYC submission ID

#### Response

Same as queue item, with file URLs included:

```json
{
  "id": "uuid",
  "user": { ... },
  "documentType": "NATIONAL_ID",
  "frontFileUrl": "/api/kyc/file/{id}/front",
  "backFileUrl": "/api/kyc/file/{id}/back",
  "status": "SUBMITTED",
  "createdAt": "2026-04-08T18:00:00Z"
}
```

---

### 7. Review KYC (Admin Only)

**PATCH** `/admin/:id/review`

Approves or rejects a KYC submission.

#### URL Parameters

- `id` (string): KYC submission ID

#### Request DTO

```typescript
{
  "status": "APPROVED" | "REJECTED";  // Required
  "rejectionNote": string;             // Required if status is REJECTED, max 500 chars
}
```

#### Response

```json
{
  "id": "uuid",
  "userId": "uuid",
  "documentType": "NATIONAL_ID",
  "frontFilePath": "string",
  "backFilePath": "string | null",
  "status": "APPROVED" | "REJECTED",
  "reviewedBy": "admin-uuid",
  "rejectionNote": "string | null",
  "createdAt": "2026-04-08T18:00:00Z",
  "updatedAt": "2026-04-08T18:00:00Z"
}
```

#### Side Effects

- **If APPROVED:** User status automatically changes to `VERIFIED`, allowing loan applications
- **If REJECTED:** User remains in current status; must resubmit KYC

#### Error Cases

- **400 Bad Request:** KYC already reviewed or invalid status
- **403 Forbidden:** User is not an admin

#### Example

**React:**

```javascript
const response = await fetch(
  `http://localhost:3001/api/kyc/admin/${kycId}/review`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAccessToken}`,
    },
    body: JSON.stringify({
      status: 'APPROVED',
    }),
  },
);
```

---

## Loans Module

**Base URL:** `/api/loans`

**Authentication:** Required for all endpoints

### 1. Apply for Loan

**POST** `/apply`

Submits a new loan application. User must have approved KYC.

#### Request DTO

```typescript
{
  "principal": number;    // Required. Loan amount in currency units (e.g., 5000)
  "termMonths": number;   // Required. Repayment period: 1-60 months
  "purpose": string;      // Optional. Reason for the loan (e.g., "School fees")
}
```

#### Response

```json
{
  "id": "uuid",
  "userId": "uuid",
  "principal": "5000.00",
  "annualRate": null,
  "termMonths": 12,
  "status": "PENDING",
  "disbursedAt": null,
  "purpose": "School fees",
  "createdAt": "2026-04-08T18:00:00Z",
  "updatedAt": "2026-04-08T18:00:00Z"
}
```

#### Error Cases

- **400 Bad Request:** Invalid principal or term months
- **403 Forbidden:** User KYC not approved, or already has an active loan
- **404 Not Found:** User not found

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/loans/apply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
  body: JSON.stringify({
    principal: 5000,
    termMonths: 12,
    purpose: 'School fees',
  }),
});
```

---

### 2. Get My Loans

**GET** `/my`

Retrieves all loans (past and present) for the current user.

#### Response

Array of loan objects (same as Apply response)

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/loans/my', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});
const loans = await response.json();
```

---

### 3. Get Loan Detail with Dashboard

**GET** `/:id`

Retrieves full loan details including amortization schedule and accrued interest.

#### URL Parameters

- `id` (string): Loan ID

#### Response

```json
{
  "id": "uuid",
  "userId": "uuid",
  "principal": "5000.00",
  "annualRate": "0.1800",
  "termMonths": 12,
  "status": "ACTIVE",
  "disbursedAt": "2026-04-08T18:00:00Z",
  "purpose": "School fees",
  "createdAt": "2026-04-08T18:00:00Z",
  "updatedAt": "2026-04-08T18:00:00Z",
  "schedule": [
    {
      "id": "uuid",
      "loanId": "uuid",
      "installmentNo": 1,
      "dueDate": "2026-05-08",
      "principalDue": "416.67",
      "interestDue": "75.00",
      "totalDue": "491.67",
      "paid": false
    }
    // ... more installments
  ],
  "dashboard": {
    "outstandingPrincipal": "4583.33",
    "accruedInterestToDate": "150.00",
    "nextPaymentDue": "2026-05-08"
  }
}
```

#### Authorization

- User can only view their own loans
- Admin can view any loan

#### Error Cases

- **403 Forbidden:** User does not own this loan (non-admin)
- **404 Not Found:** Loan not found

---

### 4. Get Amortization Schedule

**GET** `/:id/schedule`

Retrieves the full repayment schedule for a loan.

#### URL Parameters

- `id` (string): Loan ID

#### Response

Array of amortization schedule items (same as dashboard response schedule array)

---

### 5. Get Interest Ledger

**GET** `/:id/interest`

Retrieves daily interest accrual records for a loan.

#### URL Parameters

- `id` (string): Loan ID

#### Response

```json
[
  {
    "id": "uuid",
    "loanId": "uuid",
    "date": "2026-04-08",
    "dailyInterest": "24.657534",
    "balanceSnapshot": "5000.00"
  },
  {
    "id": "uuid",
    "loanId": "uuid",
    "date": "2026-04-09",
    "dailyInterest": "24.657534",
    "balanceSnapshot": "5000.00"
  }
  // ... daily entries
]
```

---

### 6. Get All Loans (Admin Only)

**GET** `/admin/all?page=1&limit=10&status=PENDING`

Retrieves all loans with optional status filter.

#### Query Parameters

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `status` (string, optional): `PENDING | ACTIVE | CLOSED | REJECTED`

#### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "principal": "5000.00",
      "annualRate": null,
      "termMonths": 12,
      "status": "PENDING",
      "disbursedAt": null,
      "purpose": "School fees",
      "createdAt": "2026-04-08T18:00:00Z",
      "updatedAt": "2026-04-08T18:00:00Z",
      "user": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@example.com"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 100,
  "totalPages": 10
}
```

#### Error Cases

- **403 Forbidden:** User is not an admin

---

### 7. Review Loan (Admin Only)

**PATCH** `/admin/:id/review`

Approves or rejects a pending loan application.

#### URL Parameters

- `id` (string): Loan ID

#### Request DTO

```typescript
{
  "status": "ACTIVE" | "REJECTED";      // Required
  "annualRate": number;                 // Required if status is ACTIVE. Range: 0-1 (e.g., 0.18 for 18%)
}
```

#### Response

```json
{
  "id": "uuid",
  "userId": "uuid",
  "principal": "5000.00",
  "annualRate": "0.1800",
  "termMonths": 12,
  "status": "ACTIVE",
  "disbursedAt": "2026-04-08T18:00:00Z",
  "purpose": "School fees",
  "createdAt": "2026-04-08T18:00:00Z",
  "updatedAt": "2026-04-08T18:00:00Z"
}
```

#### Side Effects

- **If ACTIVE:** Amortization schedule is auto-generated; daily interest accrual begins
- **If REJECTED:** Loan remains in PENDING state until re-reviewed

#### Error Cases

- **400 Bad Request:** Annual rate missing or invalid; loan not in PENDING status
- **403 Forbidden:** User is not an admin

#### Example

**React:**

```javascript
const response = await fetch(
  `http://localhost:3001/api/loans/admin/${loanId}/review`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAccessToken}`,
    },
    body: JSON.stringify({
      status: 'ACTIVE',
      annualRate: 0.18,
    }),
  },
);
```

---

## Users Module

**Base URL:** `/api/users`

**Authentication:** Required for all endpoints

### 1. Get My Profile

**GET** `/me`

Retrieves the current user's profile information.

#### Response

```json
{
  "id": "uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+263771234567",
  "role": "USER",
  "status": "VERIFIED",
  "createdAt": "2026-04-08T18:00:00Z",
  "updatedAt": "2026-04-08T18:00:00Z"
}
```

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/users/me', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});
const profile = await response.json();
```

---

### 2. Update My Profile

**PUT** `/me`

Updates the current user's profile information.

#### Request DTO

```typescript
{
  "firstName": string;   // Optional
  "lastName": string;    // Optional
  "phone": string;       // Optional. Must be unique and valid international format
}
```

#### Response

Same as Get My Profile response

#### Error Cases

- **409 Conflict:** Phone number already in use by another user

#### Example

**React:**

```javascript
const response = await fetch('http://localhost:3001/api/users/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
  body: JSON.stringify({
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+263771234568',
  }),
});
```

---

### 3. Get All Users (Admin Only)

**GET** `/admin/list?page=1&limit=10`

Retrieves all users with KYC and loan status information.

#### Query Parameters

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

#### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "phone": "+263771234567",
      "role": "USER",
      "status": "VERIFIED",
      "createdAt": "2026-04-08T18:00:00Z",
      "updatedAt": "2026-04-08T18:00:00Z",
      "kycStatus": "APPROVED",
      "activeLoans": 1,
      "totalLoans": 3
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 150,
  "totalPages": 15
}
```

#### Error Cases

- **403 Forbidden:** User is not an admin

---

## Audit Trail Module

**Base URL:** `/api/audit-trail`

**Authentication:** Required for all endpoints  
**Authorization:** Admin only

### 1. Get Audit Activity (Admin Only)

**GET** `/admin/list?page=1&limit=20`

Returns paginated system activity logs captured from incoming HTTP requests.

#### Query Parameters

- `page` (number, optional): Page number, default `1`
- `limit` (number, optional): Records per page, default `20`, max `100`
- `method` (string, optional): Filter by HTTP method. Supported values: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- `statusCode` (number, optional): Filter by HTTP response status code
- `actorId` (string, optional): Filter by authenticated actor user ID
- `search` (string, optional): Case-insensitive search across path, action, actor email, first name, and last name
- `from` (ISO datetime, optional): Lower bound for log creation time
- `to` (ISO datetime, optional): Upper bound for log creation time

#### Response

```json
{
  "total": 2,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "id": "c3c6b7f0-5774-4f29-80c0-66452c7ef111",
      "action": "POST /api/auth/login",
      "method": "POST",
      "path": "/api/auth/login",
      "statusCode": 200,
      "responseTimeMs": 184,
      "ipAddress": "102.165.3.10",
      "userAgent": "Mozilla/5.0",
      "metadata": {
        "params": {},
        "query": {},
        "body": {
          "email": "admin@example.com",
          "password": "[REDACTED]"
        }
      },
      "actor": {
        "id": "6b6976df-b31f-46b8-bf61-bf8e36998db9",
        "email": "admin@example.com",
        "firstName": "System",
        "lastName": "Admin"
      },
      "createdAt": "2026-04-09T07:11:12.000Z"
    }
  ]
}
```

#### Error Cases

- **401 Unauthorized:** Missing or invalid access token
- **403 Forbidden:** User is authenticated but not an admin

#### Example

**cURL:**

```bash
curl -X GET "http://localhost:3001/api/audit-trail/admin/list?page=1&limit=20&method=POST&search=login" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

**React:**

```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  method: 'POST',
  search: 'login',
});

const response = await fetch(
  `http://localhost:3001/api/audit-trail/admin/list?${params.toString()}`,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  },
);

const logs = await response.json();
```

---

## Enums

### Role

```
USER    - Regular user (can apply for loans, submit KYC)
ADMIN   - Administrator (can review KYC and loans)
```

### UserStatus

```
PENDING   - User has registered but not verified via OTP
VERIFIED  - User has completed OTP verification
```

### OtpType

```
REGISTRATION  - OTP for account registration
RESET         - OTP for password reset (future feature)
```

### KycDocumentType

```
NATIONAL_ID  - National identity card
PASSPORT     - Passport document
```

### KycStatus

```
SUBMITTED  - KYC submitted, awaiting admin review
APPROVED   - KYC approved by admin; user can apply for loans
REJECTED   - KYC rejected; user must resubmit
```

### LoanStatus

```
PENDING   - Loan application submitted, awaiting admin review
ACTIVE    - Loan approved and disbursed; repayment begins
CLOSED    - Loan fully repaid
REJECTED  - Loan application rejected by admin
```

---

## Rate Limiting

- **Auth endpoints:** Max 10 requests per minute
- **Other endpoints:** Max 100 requests per minute

Exceeded requests return **429 Too Many Requests**.

---

## CORS

**Allowed Origins:** `http://localhost:3000` (configurable via `ALLOWED_ORIGINS` env var)

**Methods:** `GET, POST, PUT, DELETE, PATCH, OPTIONS`

**Headers:** `Content-Type, Authorization, Accept`

---

## Admin Bootstrap Account

For development/testing:

These users are created automatically by migrations:

| Role      | Email                   | Password      |
| --------- | ----------------------- | ------------- |
| Admin     | `admin@microloan.local` | `Admin@12345` |
| Demo user | `demo@kyc.dev`          | `Demo@1234`   |

⚠️ **Change this password immediately in production!**

---

## Example React API Hook

```typescript
import { useState, useCallback } from 'react';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
      body?: any,
      includeAuth: boolean = true,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (includeAuth) {
          const token = localStorage.getItem('accessToken');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const response = await fetch(`http://localhost:3001/api${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'API call failed');
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { call, loading, error };
};

export default useApi;
```

---

## Support

For issues or questions, check `/api/docs` (Swagger UI) for interactive API exploration.
