

-- Model: sat_erc_customfieldstimesheet_curr
-- Description: Current active record for TIMESHEET from SAT_ERC_CUSTOMFIELDSTIMESHEET
-- Generated: 2025-05-19 21:48:09


WITH MAX_DATE AS (
    SELECT
        TIMESHEET_HKEY,
        MAX(LOAD_DATE) AS MAX_TRANS_DATE
    FROM {{ source('eli_dv_rv', 'sat_erc_customfieldstimesheet') }}
    WHERE DELETE_FLAG = 'N'
    GROUP BY TIMESHEET_HKEY
)

SELECT
    SAT_SRC.TIMESHEET_HKEY,
    -- tagged: is_other_attr
    ABOUTTYPEID,
    CREATEDATE,
    DEFAULTVALUE,
    ENUMTEXT,
    ENUMVALUE,
    ENUMVALUESORTORDER,
    EXTERNALVALUE,
    ISREQUIRED,
    NAME,
    RECORDID,
    SORTORDER,
    TYPEID,
    VALUE,
    VALUEID,
    VISIBLETO,
    _FIVETRAN_ACTIVE,
    _FIVETRAN_END,
    _FIVETRAN_START
FROM {{ source('eli_dv_rv', 'sat_erc_customfieldstimesheet') }} SAT_SRC
INNER JOIN MAX_DATE MD
    ON SAT_SRC.TIMESHEET_HKEY = MD.TIMESHEET_HKEY
    AND SAT_SRC. = MD.MAX_TRANS_DATE
    AND SAT_SRC.DELETE_FLAG = 'N'



