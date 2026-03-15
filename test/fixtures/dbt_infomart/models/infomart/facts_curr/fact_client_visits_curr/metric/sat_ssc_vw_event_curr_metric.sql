/* Count of each visit and completed visit for sales activity */

{{ config(
    unique_key='VW_EVENT_HKEY'
) }}


with
  source as (
    select *
   from {{ ref('sat_ssc_vw_event_bvv_curr') }}  --Source: Metric Sat
  ),

  fact as (
    select VW_EVENT_HKEY,
           CAST(ACTIVITYDATE AS DATE) AS FACT_DATE,     --Attr: Fact Date
           _AIRBYTE_EXTRACTED_AT    AS AIRBYTE_DATE,  --Attr: Transaction Date
          1 AS CLIENT_VISIT,                                                       --Attr: Metric
          CASE WHEN COMPLETED__C = 1 THEN 1 ELSE 0 END AS COMPLETED_CLIENT_VISIT     --Attr: Metric
    from source
    where TYPE IN ('AE - Consultant Meeting'
      ,'Client - Business Development'
      ,'Client Visit - Account Management'
      ,'Client - Engagement/AM')
  )
select * from fact

