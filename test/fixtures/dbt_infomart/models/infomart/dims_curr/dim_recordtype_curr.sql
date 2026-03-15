SELECT 
     UPPER(SHA2(
        UPPER(REPLACE(COALESCE(TRIM(a.id),'~'), '\#', '\\\#')) || '\#' ||
        UPPER(REPLACE(COALESCE(TRIM(TO_CHAR(a._AIRBYTE_EXTRACTED_AT, 'DD/MM/YYYY HH24:MI:SS')),'~'), '\#', '\\\#')) || '\#'
    )) AS DIM_RECORDTYPE_HKEY
    ,a.recordtype_hkey as BASE_OBJECT_H_KEY
    ,a._AIRBYTE_EXTRACTED_AT AS SNAPSHOT__TIMESTAMP
    ,a.id AS RECORDTYPE_BK
    ,a.name
    ,case when a.name like 'Contract%' THEN 'Talent' else a.name END as SERVICETYPE
    ,a.SOBJECTTYPE
    ,a.ISACTIVE
FROM {{ ref('sat_ssc_recordtype_bvv_curr') }} a
WHERE a.ISACTIVE = TRUE