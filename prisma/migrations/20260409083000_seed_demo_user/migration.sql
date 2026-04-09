-- Ensure default bootstrap users exist.
-- Credentials:
--   Admin: admin@microloan.local / Admin@12345
--   Demo:  demo@kyc.dev / Demo@1234
-- Passwords are bcrypt-hashed.

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
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    'Demo',
    'User',
    'demo@kyc.dev',
    '+263770000002',
    '$2b$12$0eFPzExdsr/ZIeo24xqD5uitcWQNYZ5edyRxXojkdSiPzzHovmmkC',
    'USER'::"Role",
    'VERIFIED'::"UserStatus",
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "email" = 'demo@kyc.dev'
       OR "phone" = '+263770000002'
);
