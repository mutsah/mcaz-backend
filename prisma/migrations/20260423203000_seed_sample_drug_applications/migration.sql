-- Seed sample medicine applications for development and demos.
-- Uses the existing bootstrap users:
--   Admin: 2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b
--   Demo:  a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840

INSERT INTO "drugs" (
    "id",
    "genericName",
    "strength",
    "dosageForm",
    "registrationNumber",
    "countryOfOrigin",
    "status",
    "capturedBy",
    "approvedBy",
    "dateCaptured",
    "dateApproved",
    "expiryDate",
    "createdAt",
    "updatedAt"
)
SELECT
    '06e598d6-e4cc-4cff-a6dd-7805c68250cb',
    'Paracetamol',
    '500mg',
    'ORAL'::"DosageForm",
    'ZIM1201P',
    'Zimbabwe',
    'PENDING'::"ApplicationStatus",
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    NULL,
    CURRENT_TIMESTAMP + INTERVAL '3 years' - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drugs"
    WHERE "registrationNumber" = 'ZIM1201P'
);

INSERT INTO "drugs" (
    "id",
    "genericName",
    "strength",
    "dosageForm",
    "registrationNumber",
    "countryOfOrigin",
    "status",
    "capturedBy",
    "approvedBy",
    "dateCaptured",
    "dateApproved",
    "expiryDate",
    "createdAt",
    "updatedAt"
)
SELECT
    '53fb1807-bef2-46c5-96e5-ae4cf703f1a4',
    'Amoxicillin',
    '250mg',
    'ORAL'::"DosageForm",
    'ZIM1202A',
    'South Africa',
    'APPROVED'::"ApplicationStatus",
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    '2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP + INTERVAL '3 years' - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drugs"
    WHERE "registrationNumber" = 'ZIM1202A'
);

INSERT INTO "drugs" (
    "id",
    "genericName",
    "strength",
    "dosageForm",
    "registrationNumber",
    "countryOfOrigin",
    "status",
    "capturedBy",
    "approvedBy",
    "dateCaptured",
    "dateApproved",
    "expiryDate",
    "createdAt",
    "updatedAt"
)
SELECT
    '7f63b019-f0a9-4d54-b0cd-e5b4a2644ad4',
    'Oxytetracycline',
    '100ml',
    'INJECTION'::"DosageForm",
    'ZIM1203O',
    'Botswana',
    'REJECTED'::"ApplicationStatus",
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    '2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP + INTERVAL '3 years' - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drugs"
    WHERE "registrationNumber" = 'ZIM1203O'
);

INSERT INTO "drug_status_history" (
    "id",
    "drugId",
    "status",
    "changedBy",
    "note",
    "createdAt"
)
SELECT
    '011a9cc9-0b08-4f6f-930b-92b9d18d5e0e',
    '06e598d6-e4cc-4cff-a6dd-7805c68250cb',
    'PENDING'::"ApplicationStatus",
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    'Sample pending application created for development.',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drug_status_history"
    WHERE "id" = '011a9cc9-0b08-4f6f-930b-92b9d18d5e0e'
);

INSERT INTO "drug_status_history" (
    "id",
    "drugId",
    "status",
    "changedBy",
    "note",
    "createdAt"
)
SELECT
    '4b7a6a3d-c5f8-4340-9f9c-8830dd4f171a',
    '53fb1807-bef2-46c5-96e5-ae4cf703f1a4',
    'PENDING'::"ApplicationStatus",
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    'Sample approved application captured by demo user.',
    CURRENT_TIMESTAMP - INTERVAL '8 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drug_status_history"
    WHERE "id" = '4b7a6a3d-c5f8-4340-9f9c-8830dd4f171a'
);

INSERT INTO "drug_status_history" (
    "id",
    "drugId",
    "status",
    "changedBy",
    "note",
    "createdAt"
)
SELECT
    '99a12c44-f722-4d20-9cf7-687ee3d88644',
    '53fb1807-bef2-46c5-96e5-ae4cf703f1a4',
    'APPROVED'::"ApplicationStatus",
    '2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b',
    'Sample approved application verified by admin.',
    CURRENT_TIMESTAMP - INTERVAL '6 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drug_status_history"
    WHERE "id" = '99a12c44-f722-4d20-9cf7-687ee3d88644'
);

INSERT INTO "drug_status_history" (
    "id",
    "drugId",
    "status",
    "changedBy",
    "note",
    "createdAt"
)
SELECT
    '5eb3bd83-4101-4320-b908-52302c3638d3',
    '7f63b019-f0a9-4d54-b0cd-e5b4a2644ad4',
    'PENDING'::"ApplicationStatus",
    'a6ba56e0-cbdd-4fa3-b00d-e04ca4ac6840',
    'Sample rejected application captured by demo user.',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drug_status_history"
    WHERE "id" = '5eb3bd83-4101-4320-b908-52302c3638d3'
);

INSERT INTO "drug_status_history" (
    "id",
    "drugId",
    "status",
    "changedBy",
    "note",
    "createdAt"
)
SELECT
    '614c898f-f0f0-4a80-a582-9081eb758f02',
    '7f63b019-f0a9-4d54-b0cd-e5b4a2644ad4',
    'REJECTED'::"ApplicationStatus",
    '2b5ef64e-4d9c-4984-b3b4-5af6615d3b6b',
    'Sample rejected application declined by admin after review.',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM "drug_status_history"
    WHERE "id" = '614c898f-f0f0-4a80-a582-9081eb758f02'
);
