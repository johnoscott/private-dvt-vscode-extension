
WITH dim_lead_wrk_lead AS (
    SELECT
        h.LEAD_HKEY AS BASE_OBJECT_H_KEY,
        h.ID_BK AS ID_BK,
        s._AIRBYTE_EXTRACTED_AT AS SNAPSHOT__TIMESTAMP,
        s._AIRBYTE_EXTRACTED_AT,
        s.NAME,
        s.COMPANY,
        s.ISDELETED,
        s.TITLE,
        s.DEPARTMENT__C,
        s.PHONE,
        s.EMAIL,
        s.INDUSTRY,
        s.STATUS,
        s.LEADSOURCE,
        s.ROLE_IN_PURCHASING__C,
        s.NUMBEROFEMPLOYEES,
        s.ANNUALREVENUE

 FROM {{ source('eli_dv_bv', 'hub_lead') }} h
    INNER JOIN {{ ref('sat_ssc_lead_bvv_curr') }} s ON h.LEAD_HKEY = s.LEAD_HKEY
)

SELECT
    UPPER(SHA2(
        UPPER(REPLACE(COALESCE(TRIM(ID_BK), '~'), '\#', '\\' || '\#')) || '\#' ||
        UPPER(REPLACE(COALESCE(TRIM(TO_CHAR(SNAPSHOT__TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS')), '~'), '\#', '\\' || '\#')) || '\#'
    )) AS DIM_LEAD_HKEY,
    BASE_OBJECT_H_KEY AS BASE_OBJECT_H_KEY,
    ID_BK,
    SNAPSHOT__TIMESTAMP,
    _AIRBYTE_EXTRACTED_AT,
    NAME,
    COMPANY,
    ISDELETED,
    TITLE,
    DEPARTMENT__C AS DEPARTMENT,
    PHONE,
    EMAIL,
    INDUSTRY,
    STATUS,
    LEADSOURCE,
    ROLE_IN_PURCHASING__C AS ROLE_IN_PURCHASING,
    NUMBEROFEMPLOYEES,
    ANNUALREVENUE
FROM dim_lead_wrk_lead