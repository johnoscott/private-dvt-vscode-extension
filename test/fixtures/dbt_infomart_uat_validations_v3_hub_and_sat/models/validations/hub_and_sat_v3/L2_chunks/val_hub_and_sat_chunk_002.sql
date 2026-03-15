
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 2: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_candidate_sat_ssc_contact_integration_candidate') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_sat_erc_candidate') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_sat_erc_customfieldscandidate') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_sat_bh1_candidate') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_status_sat_erc_candidate_status') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_company_sat_ssc_company') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_company_sat_erc_company') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_company_sat_erc_customfieldscompany') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_company_sat_bh1_company') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_contact_sat_ssc_contact') }}
