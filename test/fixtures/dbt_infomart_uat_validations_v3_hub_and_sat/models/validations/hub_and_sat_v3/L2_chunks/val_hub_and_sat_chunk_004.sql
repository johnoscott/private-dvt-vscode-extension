
-- Hub & Satellite Validation v3 - Level 2 Chunk
-- Chunk 4: UNION ALL of 10 satellite validations
-- This intermediate view prevents Snowflake from hitting UNION ALL limits

SELECT * FROM {{ ref('val_hub_invoicestatement_sat_bh1_invoicestatement') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_kimbleone__performanceanalysis__c_sat_sk_kimbleone__performanceanalysis__c') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_lead_sat_ssc_lead') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_bh4sf_match') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_erc_match') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_erc_client_matchamounts') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_erc_client_matchrates') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_erc_cfv_match_internal') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_erc_cfv_match_75_percent') }}
UNION ALL
SELECT * FROM {{ ref('val_hub_match_sat_erc_cfv_match_full_time') }}
