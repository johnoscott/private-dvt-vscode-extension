SELECT DISTINCT
    DIM_CONTACT.DIM_CONTACT_HKEY AS DIM_CONTACT_HKEY
    ,DIM_COMPANY.DIM_COMPANY_HKEY AS DIM_COMPANY_HKEY
    ,bridge.COMPANY_BK_PARENT
    ,DIM_POSITION.DIM_POSITION_HKEY AS DIM_POSITION_HKEY
    ,IFNULL(DIM_HR_REP_AE.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REP_AE_HKEY --Attr: Dimension HKEY
    ,IFNULL(DIM_HR_REP_AR.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REP_AR_HKEY --Attr: Dimension HKEY
    ,DIM_USER_OWNER.DIM_USER_HKEY AS DIM_USER_HKEY_OWNER
    ,DIM_USER_RECRUITER.DIM_USER_HKEY AS DIM_USER_HKEY_RECRUITER
    ,DIM_RECORDTYPE.DIM_RECORDTYPE_HKEY AS DIM_RECORDTYPE_HKEY
    ,bridge.CONTACT_BK AS CONTACT_BK
    ,bridge.COMPANY_BK AS COMPANY_BK
    ,bridge.POSITION_BK_ER AS POSITION_BK_ER
    ,bridge.POSITION_BK_SF AS POSITION_BK_SF
    ,bridge.HR_REPRESENTATIVE_BK_AE AS HR_REPRESENTATIVE_BK_AE
    ,bridge.HR_REPRESENTATIVE_BK_REC AS HR_REPRESENTATIVE_BK_REC
    ,bridge.USER_BK_OWNER AS USER_BK_OWNER
    ,bridge.USER_BK_RECRUITER AS USER_BK_RECRUITER
    ,metric_sat1.AIRBYTE_DATE
    ,metric_sat1.FACT_DATE
    ,metric_sat1.RECORD_TYPE
    ,metric_sat1.DIVISION
    ,metric_sat1.DOMAIN
    ,metric_sat1.SEGMENT
    ,metric_sat1.QUALIFIED_REQS
    ,metric_sat1.CLOSED_REQS
    ,DIM_TIME.DATE_KEY AS DATE_KEY

FROM {{ source('eli_dv_bv', 'brg_fact_reqs') }} bridge

JOIN {{ ref('sat_bh4sf_reqs_curr_metric') }} metric_sat1
    ON METRIC_SAT1.POSITION_HKEY = bridge.POSITION_HKEY_SF

-- dimensions
JOIN {{ ref('dim_time') }} AS DIM_TIME
    ON DIM_TIME.DATE_KEY = metric_sat1.FACT_DATE

JOIN {{ ref('dim_contact_curr') }} AS DIM_CONTACT
    ON DIM_CONTACT.BASE_OBJECT_H_KEY = bridge.contact_hkey

JOIN {{ ref('dim_company_curr') }} AS DIM_COMPANY
    ON DIM_COMPANY.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY

JOIN {{ ref('dim_parent_company_curr') }} AS DIM_PARENT_COMPANY
    ON DIM_PARENT_COMPANY.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_PARENT

JOIN {{ ref('dim_position_curr') }} AS DIM_POSITION
    ON DIM_POSITION.BASE_OBJECT_H_KEY = bridge.POSITION_HKEY_SF

LEFT JOIN {{ ref('dim_hr_representative_account_executive_curr') }} AS DIM_HR_REP_AE
    ON DIM_HR_REP_AE.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY_AE

LEFT JOIN {{ ref('dim_hr_representative_assigned_recruiter_curr') }} AS DIM_HR_REP_AR
    ON DIM_HR_REP_AR.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY_REC

JOIN {{ ref('dim_user_curr') }} AS DIM_USER_OWNER
    ON DIM_USER_OWNER.BASE_OBJECT_H_KEY = bridge.USER_HKEY_OWNER

JOIN {{ ref('dim_user_curr') }} AS DIM_USER_RECRUITER
    ON DIM_USER_RECRUITER.BASE_OBJECT_H_KEY = bridge.USER_HKEY_RECRUITER

JOIN {{ ref('dim_recordtype_curr') }} AS DIM_RECORDTYPE      --Object: Dimension Type 1
    ON DIM_RECORDTYPE.BASE_OBJECT_H_KEY = bridge.RECORDTYPE_HKEY


-- CURRENT ACTIVE LINK RELATIONSHIP
JOIN {{ ref('lna_position_company__position_hkey_curr') }} AS lpco
    ON lpco.LNA_POSITION_COMPANY_HKEY = bridge.LNA_POSITION_COMPANY_HKEY

JOIN {{ ref('lna_position_contact_tr1hiringmanagerc__position_hkey_curr') }} AS lphm
    ON lphm.LNA_POSITION_CONTACT_TR1HIRINGMANAGERC_HKEY = bridge.LNA_POSITION_CONTACT_TR1HIRINGMANAGERC_HKEY

JOIN {{ ref('lna_position_position_dwerecruitpositionid__position_hkey_curr') }} AS lppr
    ON lppr.LNA_POSITION_POSITION_DWERECRUITPOSITIONID_HKEY = bridge.LNA_POSITION_POSITION_DWERECRUITPOSITIONID_HKEY

JOIN {{ ref('lna_position_recordtype__position_hkey_curr') }} AS lprt
    ON lprt.LNA_POSITION_RECORDTYPE_HKEY = bridge.LNA_POSITION_RECORDTYPE_HKEY

JOIN {{ ref('lna_position_user_ownerid__position_hkey_curr') }} AS lpuo
    ON lpuo.LNA_POSITION_USER_OWNERID_HKEY = bridge.LNA_POSITION_USER_OWNERID_HKEY

JOIN {{ ref('lna_position_user_tr1sourcingrecruiterc__position_hkey_curr') }} AS lpur
    ON lpur.LNA_POSITION_USER_TR1SOURCINGRECRUITERC_HKEY = bridge.LNA_POSITION_USER_TR1SOURCINGRECRUITERC_HKEY

JOIN {{ ref('lnk_position_hrrepresentative_ownerid__position_hkey_curr') }} AS lpho
    ON lpho.LNK_POSITION_HRREPRESENTATIVE_OWNERID_HKEY = bridge.LNK_POSITION_HRREPRESENTATIVE_OWNERID_HKEY

JOIN {{ ref('lnk_position_hrrepresentative_workingid__position_hkey_curr') }} AS lphw
    ON lphw.LNK_POSITION_HRREPRESENTATIVE_WORKINGID_HKEY = bridge.LNK_POSITION_HRREPRESENTATIVE_WORKINGID_HKEY