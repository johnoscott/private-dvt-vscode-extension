
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 7: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_scheduleditemtypes_sat_erc_scheduleditemtypes') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_task_sat_oa_task') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheet_sat_oa_timesheet') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheet_sat_erc_timesheet') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheet_sat_erc_customfieldstimesheet') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheet_sat_bh1_timesheet') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheetentry_sat_bh1_timesheetentry') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheetlineattribution_sat_erc_timesheetlineattribution') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheetlineattribution_sat_erc_client_getexistingtimesheetamountsfortimesheetlineattribution') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_timesheetlineattribution_sat_erc_customfieldstimesheetlineattribution') }}
