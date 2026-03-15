
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 8: UNION ALL of 8 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_timesheetlineentry_sat_erc_timesheetlineentry') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheetlineentry_sat_erc_customfieldstimesheetlineentry') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_tr1__application_history__c_sat_bh4sf_tr1__application_history__c') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_transaction_sat_oa_transaction') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_transaction_sat_erc_transaction') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_user_sat_ssc_user') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_vw_event_sat_ssc_vw_event') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_zoom_phone_activity_sat_zm_zoom_phone_activity') }}
