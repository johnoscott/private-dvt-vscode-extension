WITH "DVO_BASE1" AS
	( -- This CTE retrieves the departments and their associated entities
		SELECT
			  "DVO_SRC1"."DEPARTMENTS_HKEY" AS "BASE_OBJECT_H_KEY"
			, "DVO_SRC1"."DEPARTMENTS_BK" AS "DEPARTMENTS_BK"
			, "SAT_SRC1_1_1"."LOAD_DATE" AS "SNAPSHOT__TIMESTAMP"
			, "SAT_SRC1_1_1"."ENTITYID" AS "ENTITYID"
			, "SAT_SRC1_1_1"."NAME" AS "NAME"
		FROM {{ source('eli_dv_bv', 'hub_departments') }} "DVO_SRC1"
		INNER JOIN {{ ref('sat_erc_departments_bvv_curr') }} "SAT_SRC1_1_1"
		  ON  "DVO_SRC1"."DEPARTMENTS_HKEY" = "SAT_SRC1_1_1"."DEPARTMENTS_HKEY"
        WHERE "SAT_SRC1_1_1"."ENTITYID" = '00000000-0000-0000-0000-000000000E01'
	)
	, "DVO_BASE3" AS
	( -- This CTE retrieves the recruiter departments and their default status
		SELECT
			  "DVO_SRC3"."RECRUITERDEPARTMENTS_HKEY" AS "BASE_OBJECT_H_KEY"
			, "DVO_SRC3"."RECORDID_BK" AS "RECORDID_BK"
			, "SAT_SRC3_1_1"."LOAD_DATE" AS "SNAPSHOT__TIMESTAMP"
			, "SAT_SRC3_1_1"."ISDEFAULT" AS "ISDEFAULT"
		FROM {{ source('eli_dv_bv', 'hub_recruiterdepartments') }} "DVO_SRC3"
		INNER JOIN {{ ref('sat_erc_recruiterdepartments_bvv_curr') }} "SAT_SRC3_1_1"
		  ON  "DVO_SRC3"."RECRUITERDEPARTMENTS_HKEY" = "SAT_SRC3_1_1"."RECRUITERDEPARTMENTS_HKEY"
        WHERE "SAT_SRC3_1_1"."ISDEFAULT" = TRUE
	)
	, "DVO_BASE5" AS
	(	 -- This CTE retrieves the HR representatives and their details
		SELECT
			  "DVO_SRC5"."HR_REPRESENTATIVE_HKEY" AS "BASE_OBJECT_H_KEY"
			, "DVO_SRC5"."HR_REPRESENTATIVE_BK" AS "HR_REPRESENTATIVE_BK"
			, "SAT_SRC5_1_1"."LOAD_DATE" AS "SNAPSHOT__TIMESTAMP"
			, "SAT_SRC5_1_1"."FULLNAME" AS "FULLNAME"
			, "SAT_SRC5_1_1"."EMAIL" AS "EMAIL"
			, "SAT_SRC5_1_1"."TITLE" AS "TITLE"
			, "SAT_SRC5_1_1"."EXTERNALPAYROLLID" AS "EXTERNALPAYROLLID"
		FROM {{ source('eli_dv_bv', 'hub_hr_representative') }} "DVO_SRC5"
		INNER JOIN {{ ref('sat_erc_hr_representative_bvv_curr') }} "SAT_SRC5_1_1"
		  ON "DVO_SRC5"."HR_REPRESENTATIVE_HKEY" = "SAT_SRC5_1_1"."HR_REPRESENTATIVE_HKEY"
	)
	, "DVO_BASE2" AS
	(	 -- This CTE retrieves the department relationships for recruiter departments
		 -- It ensures that we only get the latest department for each recruiter department
		SELECT
			  "DVO_SRC2"."RECRUITERDEPARTMENTS_HKEY" AS "BASE_OBJECT_H_KEY" -- Partition Key
			, "DVO_SRC2"."LNK_RECRUITERDEPARTMENTS_DEPARTMENTS_HKEY" AS "BASE_OBJECT_L_H_KEY"
			, "DVO_SRC2"."DEPARTMENTS_HKEY" AS "BASE_OBJECT_F_H_KEY"
			, "SAT_SRC2_1_1"."LOAD_DATE" AS "SNAPSHOT__TIMESTAMP"
		FROM {{ source('eli_dv_bv', 'lnk_recruiterdepartments_departments') }} "DVO_SRC2"
		INNER JOIN {{ ref('lks_erc_recruiterdepartments_departments_bvv_curr') }} "SAT_SRC2_1_1"
			ON "DVO_SRC2"."LNK_RECRUITERDEPARTMENTS_DEPARTMENTS_HKEY" = "SAT_SRC2_1_1"."LNK_RECRUITERDEPARTMENTS_DEPARTMENTS_HKEY"
	)
    , "DVO_BASE4" AS
	(	 -- This CTE retrieves the recruiter department relationships for HR representatives
		 -- It ensures that we only get the latest recruiter department for each HR representative
		SELECT
			  "DVO_SRC4"."RECRUITERDEPARTMENTS_HKEY" AS "BASE_OBJECT_H_KEY"
			, "DVO_SRC4"."LNK_RECRUITERDEPARTMENTS_HRREPRESENTATIVE_HKEY" AS "BASE_OBJECT_L_H_KEY"
			, "DVO_SRC4"."HR_REPRESENTATIVE_HKEY" AS "BASE_OBJECT_F_H_KEY" --Partition Key
			, "SAT_SRC4_1_1"."LOAD_DATE" AS "SNAPSHOT__TIMESTAMP"
		FROM {{ source('eli_dv_bv', 'lnk_recruiterdepartments_hrrepresentative') }} "DVO_SRC4"
		INNER JOIN {{ ref('lks_erc_recruiterdepartments_hrrepresentative_bvv_curr') }} "SAT_SRC4_1_1"
			ON "DVO_SRC4"."LNK_RECRUITERDEPARTMENTS_HRREPRESENTATIVE_HKEY" = "SAT_SRC4_1_1"."LNK_RECRUITERDEPARTMENTS_HRREPRESENTATIVE_HKEY"
	)
        SELECT
              UPPER(SHA2(  UPPER(REPLACE(COALESCE(TRIM( "DVO_BASE5"."HR_REPRESENTATIVE_BK"),'~'),'\#','\\' || '\#')) || '\#' ||
                UPPER(REPLACE(COALESCE(TRIM( TO_CHAR("DVO_BASE5"."SNAPSHOT__TIMESTAMP", 'DD/MM/YYYY HH24:MI:SS')),'~'),'\#','\\' || '\#'))|| '\#'  )) 
				AS "DIM_HR_REPRESENTATIVE_AE_HKEY"
            , "DVO_BASE5"."BASE_OBJECT_H_KEY" AS "BASE_OBJECT_H_KEY"
			, "DVO_BASE5"."HR_REPRESENTATIVE_BK" AS "HR_REPRESENTATIVE_BK"
            , "DVO_BASE5"."SNAPSHOT__TIMESTAMP" AS "SNAPSHOT__TIMESTAMP"
            , "DVO_BASE1"."ENTITYID" AS "ENTITYID"
            , "DVO_BASE1"."NAME" AS "NAME"
            , "DVO_BASE3"."ISDEFAULT" AS "ISDEFAULT"
            , "DVO_BASE5"."FULLNAME" AS "FULLNAME"
            , "DVO_BASE5"."EMAIL" AS "EMAIL"
            , "DVO_BASE5"."TITLE" AS "TITLE"
            , "DVO_BASE5"."EXTERNALPAYROLLID" AS "EXTERNALPAYROLLID"
        FROM "DVO_BASE5"
		LEFT JOIN "DVO_BASE4" ON "DVO_BASE5"."BASE_OBJECT_H_KEY" = "DVO_BASE4"."BASE_OBJECT_F_H_KEY" 
        LEFT JOIN "DVO_BASE3" ON "DVO_BASE4"."BASE_OBJECT_H_KEY" = "DVO_BASE3"."BASE_OBJECT_H_KEY"
        LEFT JOIN "DVO_BASE2" ON "DVO_BASE3"."BASE_OBJECT_H_KEY" = "DVO_BASE2"."BASE_OBJECT_H_KEY" 
        LEFT JOIN "DVO_BASE1" ON "DVO_BASE2"."BASE_OBJECT_F_H_KEY" = "DVO_BASE1"."BASE_OBJECT_H_KEY"
		WHERE ("DVO_BASE1"."ENTITYID" is not null
		AND "DVO_BASE3"."ISDEFAULT" is not null)
		OR "DVO_BASE5"."HR_REPRESENTATIVE_BK" IN ('-2147483648','-2147483647')