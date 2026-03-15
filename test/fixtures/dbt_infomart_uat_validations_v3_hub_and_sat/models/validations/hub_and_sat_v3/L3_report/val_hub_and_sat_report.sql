
-- Hub & Satellite Validation v3 - Final Report
-- Combines all 8 chunks into comprehensive validation report
-- This table can be queried directly for validation results

WITH combined_chunks AS (
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_001') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_002') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_003') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_004') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_005') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_006') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_007') }}
    UNION ALL
    SELECT * FROM {{ ref('val_hub_and_sat_chunk_008') }}
)

SELECT *
FROM combined_chunks
ORDER BY HUB_NAME, SATELLITE_NAME