/* Create current view of subset of SAT_ZM_ZOOM_PHONE_ACTIVITY_CURR */
/* Filter on DIRECTION; only 'outbound' calls are counted */

{{ config(
    unique_key='ZOOM_PHONE_ACTIVITY_HKEY'
) }}


with
  source as (
    select *
    from {{ ref('sat_zm_zoom_phone_activity_bvv_curr') }}
  ),

  fact as (
    select ZOOM_PHONE_ACTIVITY_HKEY,
           CAST(START_TIME AS DATE) AS FACT_DATE,     --Attr: Fact Date
           _AIRBYTE_EXTRACTED_AT    AS AIRBYTE_DATE,  --Attr: Transaction Date
           DURATION,                                  --Attr: Metric
           1                        AS CALL_COUNT,    --Attr: Metric
           CALL_RESULT                                --Attr: Fact
    from source
    where DIRECTION = 'outbound'                      --Filter: Fact Sat Filter
          )
select * from fact
