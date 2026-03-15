WITH TIMESHEETS_BH1 AS ( -- This CTE retrieves the timesheet BH1 information
    SELECT DISTINCT 
        DVO_SRC1.TIMESHEET_HKEY AS BASE_OBJECT_H_KEY,
        DVO_SRC1.TIMESHEET_BK AS TIMESHEET_BK,
        SAT_SRC1_1_1.DATELASTSYNC AS SNAPSHOT__TIMESTAMP,
        SAT_SRC1_1_1.ENDDATE,
        SAT_SRC1_1_1.APPROVEDDATE,
        SAT_SRC1_1_1.BILLED,
        SAT_SRC1_1_1.HOURSWORKED AS BILLEDHOURS,
        SAT_SRC1_1_1.PAID
    FROM {{ source('eli_dv_bv', 'hub_timesheet') }} DVO_SRC1
    INNER JOIN {{ ref('sat_bh1_timesheet_bvv_curr') }} SAT_SRC1_1_1
        ON DVO_SRC1.TIMESHEET_HKEY = SAT_SRC1_1_1.TIMESHEET_HKEY
),
BILLABLECHARGE_ACCOUNTINGPERIOD AS 
	( 	-- This CTE retrieves the accounting period relationships for billable charges
		-- It ensures that we only get the latest accounting period for each billable charge
		SELECT DISTINCT
			  DVO_SRC2.BILLABLECHARGE_HKEY AS BILLABLECHARGE_HKEY
			, DVO_SRC2.LNK_BILLABLECHARGE_ACCOUNTINGPERIOD_HKEY AS BASE_OBJECT_L_H_KEY
			, DVO_SRC2.ACCOUNTINGPERIOD_HKEY AS ACCOUNTINGPERIOD_HKEY
			, ROW_NUMBER() OVER (
				PARTITION BY DVO_SRC2.BILLABLECHARGE_HKEY -- Partition by billable charge to get the latest accounting period
				ORDER BY SAT_SRC2_1_3.DATELASTSYNC DESC -- Order by snapshot timestamp to get the latest
			) AS RN
			, SAT_SRC2_1_3.DATELASTSYNC AS SNAPSHOT__TIMESTAMP
		FROM {{ source('eli_dv_bv', 'lnk_billablecharge_accountingperiod') }} DVO_SRC2
		INNER JOIN {{ ref('lks_bh1_billablecharge_accountingperiod_bvv_curr') }}  SAT_SRC2_1_3 ON  DVO_SRC2.LNK_BILLABLECHARGE_ACCOUNTINGPERIOD_HKEY = SAT_SRC2_1_3.LNK_BILLABLECHARGE_ACCOUNTINGPERIOD_HKEY
),
BILLABLECHARGE_TIMESHEET AS 
	( 	-- This CTE retrieves the billable charge relationships for timesheets
		-- It ensures that we only get the latest billable charge for each timesheet
		SELECT DISTINCT
			  DVO_SRC2.BILLABLECHARGE_HKEY AS BILLABLECHARGE_HKEY
			, DVO_SRC2.LNK_BILLABLECHARGE_TIMESHEET_HKEY AS BASE_OBJECT_L_H_KEY
			, DVO_SRC2.TIMESHEET_HKEY AS TIMESHEET_HKEY
			, ROW_NUMBER() OVER (
				PARTITION BY DVO_SRC2.TIMESHEET_HKEY -- Partition by timesheet to get the latest billable charge
				ORDER BY SAT_SRC2_1_3.DATELASTSYNC DESC -- Order by snapshot timestamp to get the latest
			) AS RN
			, SAT_SRC2_1_3.DATELASTSYNC AS SNAPSHOT__TIMESTAMP
		FROM {{ source('eli_dv_bv', 'lnk_billablecharge_timesheet') }} DVO_SRC2
		INNER JOIN {{ ref('lks_bh1_billablecharge_timesheet_bvv_curr') }} SAT_SRC2_1_3 ON  DVO_SRC2.LNK_BILLABLECHARGE_TIMESHEET_HKEY = SAT_SRC2_1_3.LNK_BILLABLECHARGE_TIMESHEET_HKEY
),
BH1_ACCOUNTINGPERIOD AS ( -- This CTE retrieves the accounting period BH1 information
    Select DISTINCT
        ap.accountingperioddate AS ACCOUNTINGPERIODDATE, 
        lnkt.TIMESHEET_HKEY AS TIMESHEET_HKEY
    FROM {{ ref('sat_bh1_billablecharge_bvv_curr') }} bc
    JOIN BILLABLECHARGE_ACCOUNTINGPERIOD lnk
        ON bc.billablecharge_hkey = lnk.billablecharge_hkey
        AND lnk.RN = 1 
    JOIN {{ ref('sat_bh1_accountingperiod_bvv_curr') }} ap
        on lnk.accountingperiod_hkey = ap.accountingperiod_hkey
    JOIN BILLABLECHARGE_TIMESHEET lnkt
        on lnkt.billablecharge_hkey = bc.billablecharge_hkey
        AND lnkt.RN = 1 
),
TIMESHEET_AP_BH1 AS ( -- This CTE joins the timesheet BH1 information with the accounting period
    Select DISTINCT
        ts.BASE_OBJECT_H_KEY,
        ts.TIMESHEET_BK,
        ts.SNAPSHOT__TIMESTAMP,
        ts.ENDDATE AS TIMESHEET_WEEK_END,
        ts.ENDDATE - INTERVAL '6 DAY' AS TIMESHEET_WEEK_START,
        bap.ACCOUNTINGPERIODDATE,
        ts.APPROVEDDATE,
        ts.BILLED,
        ts.BILLEDHOURS,
        ts.PAID,
    FROM TIMESHEETS_BH1 ts
    JOIN BH1_ACCOUNTINGPERIOD bap on ts.BASE_OBJECT_H_KEY = bap.timesheet_hkey
),
TIMESHEETS_ER AS ( -- This CTE retrieves the timesheet ER information
    SELECT DISTINCT 
        DVO_SRC2.TIMESHEET_HKEY AS BASE_OBJECT_H_KEY,
        DVO_SRC2.TIMESHEET_BK AS TIMESHEET_BK,
        SAT_SRC1_1_2.LOAD_DATE AS SNAPSHOT__TIMESTAMP,
        SAT_SRC1_1_2.ENDDATE AS TIMESHEET_WEEK_END,
        SAT_SRC1_1_2.STARTDATE AS TIMESHEET_WEEK_START,
        SAT_SRC1_1_2.PAYPERIODENDDATE AS ACCOUNTINGPERIODDATE,
        SAT_SRC1_1_2.APPROVEDDATE,
        SAT_SRC1_1_2.BILLED,
        SAT_SRC1_1_2.BILLEDHOURS,
        SAT_SRC1_1_2.PAID
    FROM {{ source('eli_dv_bv', 'hub_timesheet') }} DVO_SRC2
    INNER JOIN {{ ref('sat_erc_timesheet_bvv_curr') }} SAT_SRC1_1_2
        ON DVO_SRC2.TIMESHEET_HKEY = SAT_SRC1_1_2.TIMESHEET_HKEY
)
SELECT
    UPPER(SHA2(
        UPPER(REPLACE(COALESCE(TRIM(TIMESHEET_BK),'~'), '\#', '\\\#')) || '\#' ||
        UPPER(REPLACE(COALESCE(TRIM(TO_CHAR(SNAPSHOT__TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS')),'~'), '\#', '\\\#')) || '\#'
    )) AS DIM_TIMESHEET_HKEY,
    BASE_OBJECT_H_KEY,
    TIMESHEET_BK,
    SNAPSHOT__TIMESTAMP,
    TIMESHEET_WEEK_END,
    TIMESHEET_WEEK_START,
    ACCOUNTINGPERIODDATE,
    APPROVEDDATE,
    BILLED,
    BILLEDHOURS,
    PAID
FROM TIMESHEET_AP_BH1

UNION

SELECT
    UPPER(SHA2(
        UPPER(REPLACE(COALESCE(TRIM(TIMESHEET_BK),'~'), '\#', '\\\#')) || '\#' ||
        UPPER(REPLACE(COALESCE(TRIM(TO_CHAR(SNAPSHOT__TIMESTAMP, 'DD/MM/YYYY HH24:MI:SS')),'~'), '\#', '\\\#')) || '\#'
    )) AS DIM_TIMESHEET_HKEY,
    BASE_OBJECT_H_KEY,
    TIMESHEET_BK,
    SNAPSHOT__TIMESTAMP,
    TIMESHEET_WEEK_END,
    TIMESHEET_WEEK_START,
    ACCOUNTINGPERIODDATE,
    APPROVEDDATE,
    BILLED,
    BILLEDHOURS,
    PAID
FROM TIMESHEETS_ER
