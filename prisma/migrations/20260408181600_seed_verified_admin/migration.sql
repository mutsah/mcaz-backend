-- Seed a bootstrap admin account.
-- Default credentials:
--   email: admin@microloan.local
--   password: Admin@12345
-- Change this password immediately after first login.

INSERT INTO "users" (
    "id",
    "firstName",
    "lastName",
    "email",
    "phone",
    "passwordHash",
    "role",
    "status",
    "refreshToken",
    "createdAt",
    "updatedAt"
)
SELECT
    '2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b',
    'System',
    'Administrator',
    'admin@microloan.local',
    '+263770000001',
    '$2b$12$jFaggYZdaNA861jn4xJ8H.MT8OqzmAXTmeBnH08iBCh0VGDb3jJeG',
    'ADMIN'::"Role",
    'VERIFIED'::"UserStatus",
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "email" = 'admin@microloan.local'
       OR "phone" = '+263770000001'
);