

-- Hub & Satellite Validation v3
-- Hub:       HUB_HR_REPRESENTATIVE
-- Satellite: SAT_ERC_HR_REPRESENTATIVE
-- ------------------------------------------------------------
-- TYPE-A-STANDARD
-- Source records are queried directly from the source table
-- and compared 1:1 against the hub and satellite.
-- ------------------------------------------------------------
-- Source system:    ERECRUIT_PRD
-- Source schema:    ER_INI
-- Source table:     HR_REPRESENTATIVE
-- Business key:     HR_REP_ID (NULL values excluded — VaultSpeed skips null BKs during load)
-- Record source:    ERC.HR_REPRESENTATIVE

WITH
-- 1. Source Data Analysis
-- Extract distinct business keys from the source system, normalizing them with UPPER(TRIM())
-- This represents the current state of records that SHOULD be in the Data Vault
source_data AS (
    SELECT DISTINCT
        UPPER(TRIM(HR_REP_ID)) as business_key,
        HR_REP_ID as original_key
    FROM {{ source('er_ini', 'hr_representative') }}
    WHERE HR_REP_ID IS NOT NULL -- NULL business keys are excluded: VaultSpeed skips them during load, they are not in scope for validation
),

source_metrics AS (
    SELECT COUNT(DISTINCT business_key) as source_count
    FROM source_data
),

-- 2. Hub Data Analysis
-- Extract records from the hub that were loaded from this specific source system
-- Filter by RECORD_SOURCE to handle multi-source hubs correctly
hub_data AS (
    SELECT DISTINCT
        HR_REPRESENTATIVE_HKEY as hash_key,
        UPPER(TRIM(HR_REPRESENTATIVE_BK)) as business_key,
        HR_REPRESENTATIVE_BK as original_key
    FROM {{ source('eli_dv_rv', 'hub_hr_representative') }}
    WHERE RECORD_SOURCE = 'ERC.HR_REPRESENTATIVE'
      AND LOAD_CYCLE_ID >= 0 -- exclude ghost records which have negative LOAD_CYCLE_ID
),

hub_metrics AS (
    SELECT COUNT(DISTINCT hash_key) as hub_count
    FROM hub_data
),

-- 3. Satellite Status Analysis
-- Get the most recent satellite record for each hash key to determine current status
-- Uses QUALIFY with ROW_NUMBER to efficiently get the latest record per key
sat_current_with_deletes AS (
    SELECT
        HR_REPRESENTATIVE_HKEY as hash_key,
        DELETE_FLAG
    FROM {{ source('eli_dv_rv', 'sat_erc_hr_representative') }}
    WHERE LOAD_CYCLE_ID >= 0 -- exclude ghost records which have negative LOAD_CYCLE_ID
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY HR_REPRESENTATIVE_HKEY
        ORDER BY LOAD_DATE DESC
    ) = 1  -- Current record only
),

sat_metrics AS (
    SELECT
        COUNT(CASE WHEN DELETE_FLAG = 'N' THEN 1 END) as sat_active_count,
        COUNT(CASE WHEN DELETE_FLAG = 'Y' THEN 1 END) as sat_deleted_count,
        COUNT(*) as sat_total_count
    FROM sat_current_with_deletes
),

-- 4. Comprehensive Validation
-- Join source → hub → satellite to track the data lineage and identify issues:
-- - Source LEFT JOIN Hub: Find source records that never made it to the hub (NEVER_LOADED)
-- - Hub LEFT JOIN Satellite: Find hub records without satellite records (MISSING_SATELLITE)
validation_detail AS (
    SELECT
        s.original_key as source_key,
        h.hash_key as hub_hash_key,
        h.original_key as hub_business_key,
        sc.hash_key as sat_hash_key,
        CASE
            WHEN h.business_key IS NULL THEN 'NEVER_LOADED'      -- Source record not in hub
            WHEN sc.hash_key IS NULL THEN 'MISSING_SATELLITE'    -- Hub record without satellite
            ELSE 'EXISTS_ACTIVE'                                 -- All good - record exists in hub and satellite
        END as record_status
    FROM source_data s
    LEFT JOIN hub_data h ON s.business_key = h.business_key
    LEFT JOIN sat_current_with_deletes sc ON h.hash_key = sc.hash_key
),

-- 5. Validation Metrics Aggregation
-- Aggregate the validation results to get counts and prepare for reporting
validation_metrics AS (
    SELECT
        COUNT(CASE WHEN record_status = 'EXISTS_ACTIVE' THEN 1 END) as exists_active_count,
        COUNT(CASE WHEN record_status = 'NEVER_LOADED' THEN 1 END) as never_loaded_count,
        COUNT(CASE WHEN record_status = 'MISSING_SATELLITE' THEN 1 END) as missing_satellite_count,
        COUNT(*) as total_validated
    FROM validation_detail
)

SELECT
    -- Final flattened result (orphaned logic removed in v3)
    -- Metadata columns
    'HUB_HR_REPRESENTATIVE' as HUB_NAME,
    'ERC.HR_REPRESENTATIVE' as HUB_RECORD_SOURCE,
    'ELI_DV_RV' as HUB_SCHEMA,
    'ERECRUIT_PRD' as SOURCE_NAME,
    'ER_INI' as SOURCE_SCHEMA,
    'HR_REPRESENTATIVE' as SOURCE_TABLE,
    'HR_REP_ID' as SOURCE_BUSINESS_KEY,
    '' as SOURCE_FILTER_EXPRESSION,
    'TYPE-A-STANDARD' as SOURCE_CLASSIFICATION,
    'SAT_ERC_HR_REPRESENTATIVE' as SATELLITE_NAME,
    'ELI_DV_RV' as SATELLITE_SCHEMA,
    'ERC.HR_REPRESENTATIVE' as SATELLITE_RECORD_SOURCE,

    -- Count metrics
    sm.source_count as SOURCE_COUNT,
    hm.hub_count as HUB_COUNT,
    stm.sat_active_count as SAT_ACTIVE_COUNT,
    stm.sat_deleted_count as SAT_DELETED_COUNT,
    ROUND(100.0 * stm.sat_deleted_count / NULLIF(stm.sat_total_count, 0), 2) as SAT_DELETED_PERCENT,
    stm.sat_total_count as SAT_TOTAL_COUNT,

    -- Validation metrics with percentages and status indicators
    vm.exists_active_count as EXISTS_ACTIVE_COUNT,
    ROUND(100.0 * vm.exists_active_count / NULLIF(vm.total_validated, 0), 2) as EXISTS_ACTIVE_PERCENT,

    CASE
        WHEN ROUND(100.0 * vm.never_loaded_count / NULLIF(vm.total_validated, 0), 2) >= 1 THEN '🔴'
        WHEN vm.never_loaded_count > 0 THEN '🟠'
        ELSE ''
    END as NEVER_LOADED_STATUS,
    vm.never_loaded_count as NEVER_LOADED_COUNT,
    ROUND(100.0 * vm.never_loaded_count / NULLIF(vm.total_validated, 0), 2) as NEVER_LOADED_PERCENT,

    CASE
        WHEN ROUND(100.0 * vm.missing_satellite_count / NULLIF(vm.total_validated, 0), 2) >= 1 THEN '🔴'
        WHEN vm.missing_satellite_count > 0 THEN '🟠'
        ELSE ''
    END as MISSING_SATELLITE_STATUS,
    vm.missing_satellite_count as MISSING_SATELLITE_COUNT,
    ROUND(100.0 * vm.missing_satellite_count / NULLIF(vm.total_validated, 0), 2) as MISSING_SATELLITE_PERCENT,

    -- Validation metadata
    CURRENT_TIMESTAMP as VALIDATION_TIMESTAMP

-- CROSS JOIN combines four single-row metric CTEs into one comprehensive result row
-- Each metrics CTE returns exactly ONE row with aggregated counts
-- CROSS JOIN of four single-row tables produces exactly ONE row of output
-- This is safe and efficient since there's no data duplication with single-row tables
FROM source_metrics sm               -- Single row with source_count
CROSS JOIN hub_metrics hm            -- Append hub_count to the result row
CROSS JOIN sat_metrics stm           -- Append sat_active_count, sat_deleted_count, sat_total_count
CROSS JOIN validation_metrics vm     -- Append validation counts and percentages