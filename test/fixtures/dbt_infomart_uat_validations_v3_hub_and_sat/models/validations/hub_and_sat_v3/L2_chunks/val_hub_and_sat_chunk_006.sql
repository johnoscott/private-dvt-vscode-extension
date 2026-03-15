
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 6: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_position_sat_bh4sf_position') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_position_sat_erc_position') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_position_sat_erc_cfv_position_date_qualified') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_position_sat_erc_customfieldsposition') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_position_sat_bh1_position') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_position_type_sat_erc_position_type') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_project_sat_oa_project') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_recruiterdepartments_sat_erc_recruiterdepartments') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_recruiterrolesindepartment_sat_erc_recruiterrolesindepartment') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_scheduleditems_sat_erc_scheduleditems') }}
