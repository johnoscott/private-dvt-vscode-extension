SELECT DISTINCT
     DIM_CANDIDATE.DIM_CANDIDATE_HKEY AS DIM_CANDIDATE_HKEY     
    ,DIM_COMPANY_CHILD.BASE_OBJECT_H_KEY AS COMPANY_CHILD_HKEY        
    ,DIM_COMPANY_CHILD.DIM_COMPANY_HKEY AS DIM_COMPANY_CHILD_HKEY
    ,DIM_COMPANY_PARENT.DIM_PARENT_COMPANY_HKEY AS DIM_PARENT_COMPANY_HKEY
    ,CASE WHEN bridge.COMPANY_HKEY_PARENT = '877EB9EC9CCF4AE650B89FF228711D1F52FA05FD8D2B09F6102EEF35A6321742' 
        then DIM_COMPANY_CHILD.DIM_COMPANY_HKEY else DIM_COMPANY_PARENT.DIM_PARENT_COMPANY_HKEY END AS DIM_COMPANY_PARENT_HKEY
    ,DIM_CONTACT.DIM_CONTACT_HKEY AS DIM_CONTACT_HKEY               
    ,DIM_HR_REP_AE.DIM_HR_REPRESENTATIVE_AE_HKEY AS DIM_HR_REPRESENTATIVE_AE_HKEY
    ,IFNULL(DIM_HR_REP_AE.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REP_AE_HKEY  
    ,DIM_HR_REP_AR.DIM_HR_REPRESENTATIVE_AR_HKEY AS DIM_HR_REPRESENTATIVE_AR_HKEY
    ,IFNULL(DIM_HR_REP_AR.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REP_AR_HKEY
    ,DIM_POSITION.DIM_POSITION_HKEY AS DIM_POSITION_HKEY
    ,DIM_USER_AE.DIM_ACCOUNT_EXECUTIVE_HKEY AS DIM_ACCOUNT_EXECUTIVE_HKEY
    ,DIM_USER_AR.DIM_ASSIGNED_RECRUITER_HKEY AS DIM_ASSIGNED_RECRUITER_HKEY
    ,DIM_RECORDTYPE.DIM_RECORDTYPE_HKEY AS DIM_RECORDTYPE_HKEY
    ,metric_sat1.MATCH_HKEY AS MATCH_HKEY_SF
    ,bridge.match_hkey_er AS MATCH_HKEY_ER
    ,bridge.CANDIDATE_BK AS CANDIDATE_BK     --Attr: Hub BK (from hub alias)
    ,bridge.COMPANY_BK_CHILD AS COMPANY_BK_CHILD         --Attr: Hub BK (from hub alias)
    ,CASE WHEN bridge.COMPANY_BK_PARENT = '0'
        THEN bridge.COMPANY_BK_CHILD ELSE bridge.COMPANY_BK_PARENT END AS COMPANY_BK_PARENT
    ,bridge.CONTACT_BK AS CONTACT_BK                           --Attr: Hub BK
    ,IFNULL(bridge.HR_REPRESENTATIVE_BK_AE, '-2147483648') AS HR_REPRESENTATIVE_BK_AE --Attr: Hub BK
    ,IFNULL(bridge.HR_REPRESENTATIVE_BK_REC, '-2147483648') AS HR_REPRESENTATIVE_BK_REC                     --Attr: Hub BK
    ,bridge.MATCH_BK_ER AS MATCH_BK_ER                    --Attr: Main Hub BK (Bridge)
    ,bridge.MATCH_BK_SF AS MATCH_BK_SF
    ,bridge.USER_BK_ACCOUNT_EXECUTIVE AS USER_BK_ACCOUNT_EXECUTIVE
    ,bridge.USER_BK_ASSIGNED_RECRUITER AS USER_BK_ASSIGNED_RECRUITER
    ,bridge.ID_BK AS RECORDTYPE_BK
    ,metric_sat1.AIRBYTE_DATE                              --Attr: Transaction Indicator (Metric Sat)
    ,metric_sat1.FACT_DATE                                 --Attr: Fact Date
    ,metric_sat1.FIRST_CLIENT_INTERVIEW                           --Attr: Metric
    ,metric_sat1.SUBMITTED_TO_AE                   --Attr: Metric
    ,metric_sat1.SUBMITTED_TO_HM   
    ,IFNULL(metric_sat1.DIVISION, '0') AS DIVISION
    ,IFNULL(metric_sat1.DOMAIN, '0') AS DOMAIN    
    ,IFNULL(metric_sat1.SEGMENT, '0') AS SEGMENT
    ,dt.date_key AS DATE_KEY
FROM {{ source('eli_dv_bv', 'brg_match_sf') }} bridge

JOIN {{ ref('sat_bh4sf_match_curr_metric') }} metric_sat1
    ON metric_sat1.match_hkey = bridge.match_hkey_sf

JOIN {{ ref('dim_time') }} dt
    ON dt.date_key = metric_sat1.fact_date

JOIN {{ ref('dim_candidate_curr') }} DIM_CANDIDATE          --Source: Dimension Set
    ON DIM_CANDIDATE.BASE_OBJECT_H_KEY = bridge.CANDIDATE_HKEY  

JOIN {{ ref('dim_company_curr') }} DIM_COMPANY_CHILD        --Source: Dimension Set
    ON DIM_COMPANY_CHILD.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_CHILD

JOIN {{ ref('dim_parent_company_curr') }} DIM_COMPANY_PARENT        --Source: Dimension Set
    ON DIM_COMPANY_PARENT.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_PARENT

JOIN {{ ref('dim_contact_curr') }} DIM_CONTACT        --Source: Dimension Set
    ON DIM_CONTACT.BASE_OBJECT_H_KEY = bridge.CONTACT_HKEY

LEFT JOIN {{ ref('dim_hr_representative_account_executive_curr') }} DIM_HR_REP_AE      --Source: Dimension Set
    ON DIM_HR_REP_AE.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY_AE 

LEFT JOIN {{ ref('dim_hr_representative_assigned_recruiter_curr') }} DIM_HR_REP_AR      --Source: Dimension Set
    ON DIM_HR_REP_AR.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY_REC

JOIN {{ ref('dim_position_curr') }} DIM_POSITION      --Source: Dimension Set
    ON DIM_POSITION.BASE_OBJECT_H_KEY = bridge.POSITION_HKEY

JOIN {{ ref('dim_account_executive_curr') }} DIM_USER_AE      --Source: Dimension Set
    ON DIM_USER_AE.BASE_OBJECT_H_KEY = bridge.USER_HKEY_ACCOUNT_EXECUTIVE

JOIN {{ ref('dim_assigned_recruiter_curr') }} DIM_USER_AR      --Source: Dimension Set
    ON DIM_USER_AR.BASE_OBJECT_H_KEY = bridge.USER_HKEY_ASSIGNED_RECRUITER 

JOIN {{ ref('dim_recordtype_curr') }} DIM_RECORDTYPE      --Source: Dimension Set
    ON DIM_RECORDTYPE.BASE_OBJECT_H_KEY = bridge.RECORDTYPE_HKEY

JOIN {{ ref('lna_match_candidate__match_hkey_curr') }} mlc
    ON mlc.LNA_MATCH_CANDIDATE_HKEY = bridge.LNA_MATCH_CANDIDATE_HKEY

JOIN {{ ref('lna_match_user_assignedrecruiterc__match_hkey_curr') }} mlua
    ON mlua.LNA_MATCH_USER_ASSIGNEDRECRUITERC_HKEY = bridge.LNA_MATCH_USER_ASSIGNEDRECRUITERC_HKEY

JOIN {{ ref('lnk_match_position__match_hkey_curr') }} mlp
    ON mlp.lnk_match_position_hkey = bridge.lnk_match_position_hkey

JOIN {{ ref('lna_match_match_dwerecruitmatchid__match_hkey_curr') }} mslme
    ON mslme.lna_match_match_dwerecruitmatchid_hkey = bridge.lna_match_match_dwerecruitmatchid_hkey

LEFT JOIN {{ ref('lnk_match_hrrepresentative_accountexecid__match_hkey_curr') }} melhae
    ON melhae.lnk_match_hrrepresentative_accountexecid_hkey = bridge.lnk_match_hrrepresentative_accountexecid_hkey

LEFT JOIN {{ ref('lnk_match_hrrepresentative_currentcandidateownerid__match_hkey_curr') }} melhar
    ON melhar.lnk_match_hrrepresentative_currentcandidateownerid_hkey = bridge.lnk_match_hrrepresentative_currentcandidateownerid_hkey

JOIN {{ ref('lna_position_contact_tr1contactc__position_hkey_curr') }} plc
    ON plc.lna_position_contact_tr1contactc_hkey = bridge.lna_position_contact_tr1contactc_hkey

JOIN {{ ref('lna_position_user_ownerid__position_hkey_curr') }} pluae
    ON pluae.lna_position_user_ownerid_hkey = bridge.lna_position_user_ownerid_hkey
    
JOIN {{ ref('lna_position_company__position_hkey_curr') }} plcc
    ON plcc.lna_position_company_hkey = bridge.lna_position_company_hkey

JOIN {{ ref('lnk_company_company_parentid__company_hkey_curr') }} cclp
    ON cclp.lnk_company_company_parentid_hkey = bridge.lnk_company_company_parentid_hkey

JOIN {{ ref('lna_match_recordtype__match_hkey_curr') }} msrt
    ON msrt.lna_match_recordtype_hkey = bridge.lna_match_recordtype_hkey