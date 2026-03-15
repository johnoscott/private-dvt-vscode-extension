WITH dim_user_wrk_user AS (
    SELECT 
        HUB_SRC.USER_HKEY AS BASE_OBJECT_H_KEY,
        HUB_SRC.USER_BK AS USER_BK,
        SAT_SRC1_1._AIRBYTE_EXTRACTED_AT AS SNAPSHOT__TIMESTAMP,
        SAT_SRC1_1.NAME,
        SAT_SRC1_1.EMAIL,
        SAT_SRC1_1.TITLE,
        SAT_SRC1_1.IS_ACTIVE,
        SAT_SRC1_1.ADP_FILE_NUMBER,
        SAT_SRC1_1.REGION,
        SAT_SRC1_1.USER_ROLE,
        SAT_SRC1_1.DELIVERY_TEAM,
        SAT_SRC1_1.TEAM
        FROM {{ source('eli_dv_bv', 'hub_user') }} HUB_SRC
        INNER JOIN {{ ref('sat_ssc_user_bvv_curr') }} SAT_SRC1_1
        ON SAT_SRC1_1.USER_HKEY = HUB_SRC.USER_HKEY
)

SELECT 
    UPPER(SHA2(
        UPPER(REPLACE(COALESCE(TRIM(USER_BK),'~'), '\#', '\\\#')) || '\#' ||
        UPPER(REPLACE(COALESCE(TRIM(TO_CHAR(SNAPSHOT__TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS')),'~'), '\#', '\\\#')) || '\#'
    )) AS DIM_ACCOUNT_EXECUTIVE_HKEY,
    BASE_OBJECT_H_KEY,
    USER_BK,
    SNAPSHOT__TIMESTAMP,
    NAME,
    EMAIL,
    TITLE,
    IS_ACTIVE,
    ADP_FILE_NUMBER,
    REGION,
    USER_ROLE,
    DELIVERY_TEAM,
    TEAM
FROM dim_user_wrk_user 