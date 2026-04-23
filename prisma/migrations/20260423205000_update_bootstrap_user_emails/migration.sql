-- Update bootstrap user emails to match the MCAZ domain.

UPDATE "users"
SET "email" = 'admin@mcaz.local',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b'
  AND "email" = 'admin@microloan.local';

UPDATE "users"
SET "email" = 'demo@mcaz.local',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840'
  AND "email" = 'demo@kyc.dev';