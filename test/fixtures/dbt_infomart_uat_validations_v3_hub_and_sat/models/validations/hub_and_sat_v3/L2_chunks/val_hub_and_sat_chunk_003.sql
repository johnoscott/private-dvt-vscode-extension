
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 3: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_contact_sat_ssc_contact_integration_clientcontact') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_contact_sat_erc_contact') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_contact_sat_bh1_contact') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_contract_sat_ssc_contract') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_credittypes_sat_erc_credittypes') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_customfieldshr_rep_sat_erc_customfieldshr_rep') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_departmentroles_sat_erc_departmentroles') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_departments_sat_erc_departments') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_hr_representative_sat_erc_hr_representative') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_invoiceline_sat_erc_invoiceline') }}
