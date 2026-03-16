
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 1: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_accountingperiod_sat_bh1_accountingperiod') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_billablecharge_sat_bh1_billablecharge') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_billmaster_sat_bh1_billmaster') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_billmastertransaction_sat_bh1_billmastertransaction') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_billmastertransactiondistributionbatch_sat_bh1_billmastertransactiondistributionbatch') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_burdenvms_sat_erc_burdenvms') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_campaign_sat_ssc_campaign') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_sat_oa_candidate') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_sat_sk_candidate') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_candidate_sat_ssc_candidate') }}
