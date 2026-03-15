{{ config(
    materialized = 'table', 
    transient=false
) }}

with company_exceptions as (
    select
        UPPER(COMPANY_BK) as COMPANY_BK
    from {{ source('eli_dv_bv', 'hub_company') }}
    WHERE  UPPER(COMPANY_BK) IN (
            UPPER('001UQ00000D7vgUYAR'),
            UPPER('001UQ00000ECXkvYAH'),
            UPPER('001UQ00000EMhHaYAL'),
            UPPER('001UQ000002D2Z1YAK')
        )
)
Select * from company_exceptions