
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 5: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_match_sat_erc_customfieldsmatch') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_opportunity_sat_ssc_opportunity') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_opportunity_sat_bh1_opportunity') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_payablecharge_sat_bh1_payablecharge') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_paymaster_sat_bh1_paymaster') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_paymastertransaction_sat_bh1_paymastertransaction') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_pcoi_burden_sat_bh1_pcoi_burden') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_placement_sat_bh4sf_placement') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_placement_sat_bh1_placement') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_placementratecardlinegroup_sat_bh1_placementratecardlinegroup') }}
