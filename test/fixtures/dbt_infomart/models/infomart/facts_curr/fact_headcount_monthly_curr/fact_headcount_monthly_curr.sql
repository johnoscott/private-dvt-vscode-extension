--Fact Headcount Monthly
SELECT DISTINCT
     DIM_CANDIDATE.DIM_CANDIDATE_HKEY AS DIM_CANDIDATE_HKEY             --Attr: Dimension HKEY                  
    ,DIM_COMPANY.DIM_COMPANY_HKEY AS DIM_COMPANY_HKEY                   --Attr: Dimension HKEY       
    ,DIM_CONTACT.DIM_CONTACT_HKEY AS DIM_CONTACT_HKEY                   --Attr: Dimension HKEY                     
    ,IFNULL(DIM_HR_REP_AE.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REP_AE_HKEY --Attr: Dimension HKEY
    ,IFNULL(DIM_HR_REP_AR.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REP_AR_HKEY --Attr: Dimension HKEY
    ,DIM_POSITION.DIM_POSITION_HKEY AS DIM_POSITION_HKEY                    --Attr: Dimension HKEY
    ,DIM_USER_AE.DIM_ACCOUNT_EXECUTIVE_HKEY AS DIM_ACCOUNT_EXECUTIVE_HKEY   --Attr: Dimension HKEY
    ,DIM_USER_AR.DIM_ASSIGNED_RECRUITER_HKEY AS DIM_ASSIGNED_RECRUITER_HKEY --Attr: Dimension HKEY
    ,DIM_MATCH_SF.DIM_MATCH_HKEY AS DIM_MATCH_HKEY                      --Attr: Dimension HKEY
    ,DIM_RECORDTYPE.DIM_RECORDTYPE_HKEY AS DIM_RECORDTYPE_HKEY          --Attr: Dimension HKEY
    ,bridge.CANDIDATE_BK AS CANDIDATE_BK                                --Attr: Hub BK
    ,bridge.COMPANY_BK AS COMPANY_BK                                    --Attr: Hub BK
    ,bridge.CONTACT_BK AS CONTACT_BK                                    --Attr: Hub BK
    ,IFNULL(bridge.HR_REPRESENTATIVE_BK_AE, '-2147483648') AS HR_REPRESENTATIVE_BK_AE   --Attr: Hub BK
    ,IFNULL(bridge.HR_REPRESENTATIVE_BK_REC, '-2147483648') AS HR_REPRESENTATIVE_BK_REC --Attr: Hub BK
    ,bridge.POSITION_BK AS POSITION_BK                                  --Attr: Hub BK
    ,bridge.USER_BK_AE AS USER_BK_ACCOUNT_EXECUTIVE                     --Attr: Hub BK
    ,bridge.USER_BK_AR AS USER_BK_ASSIGNED_RECRUITER                    --Attr: Hub BK
    ,bridge.MATCH_BK_SF AS MATCH_BK_SF                                  --Attr: Hub BK
    ,bridge.ID_BK AS RECORDTYPE_BK                                      --Attr: Hub BK
    ,metric_sat1.CALENDAR_YEAR_MONTH                                      --Attr: Metric Dim Attr
    ,metric_sat1.CONTRACT_STARTING_HEADCOUNT                            --Attr: Metric
    ,metric_sat1.CONTRACT_ENDING_HEADCOUNT                              --Attr: Metric
    ,metric_sat1.CONSULTING_STARTING_HEADCOUNT                          --Attr: Metric
    ,metric_sat1.CONSULTING_ENDING_HEADCOUNT                            --Attr: Metric
    ,metric_sat1.TOTAL_STARTING_HEADCOUNT                               --Attr: Metric
    ,metric_sat1.TOTAL_ENDING_HEADCOUNT                                 --Attr: Metric
    ,metric_sat1.RECORD_TYPE                                            --Attr: Metric Dim Attr
    ,metric_sat1.DIVISION                                               --Attr: Metric Dim Attr
    ,metric_sat1.DOMAIN                                                 --Attr: Metric Dim Attr
    ,metric_sat1.SEGMENT                                                --Attr: Metric Dim Attr

from {{ source('eli_dv_bv', 'brg_placement_daily') }} bridge                   --Object: Bridge

JOIN {{ ref('sat_bh4sf_headcount_curr_metric_monthly') }} metric_sat1 --Object: metric sat
ON metric_sat1.PLACEMENT_HKEY = bridge.PLACEMENT_HKEY_SFORCE

JOIN {{ ref('dim_candidate_curr') }} DIM_CANDIDATE --Object: Dimension Type 1
    ON DIM_CANDIDATE.BASE_OBJECT_H_KEY = bridge.CANDIDATE_HKEY

JOIN {{ ref('dim_company_curr') }} DIM_COMPANY      --Object: Dimension Type 1
    ON DIM_COMPANY.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY

JOIN {{ ref('dim_contact_curr') }} DIM_CONTACT      --Object: Dimension Type 1
    ON DIM_CONTACT.BASE_OBJECT_H_KEY = bridge.CONTACT_HKEY

LEFT JOIN {{ ref('dim_hr_representative_account_executive_curr') }} DIM_HR_REP_AE  --Object: Dimension Type 1
    ON DIM_HR_REP_AE.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY_AE

LEFT JOIN {{ ref('dim_hr_representative_assigned_recruiter_curr') }} DIM_HR_REP_AR --Object: Dimension Type 1
    ON DIM_HR_REP_AR.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY_REC

JOIN {{ ref('dim_position_curr') }} DIM_POSITION    --Object: Dimension Type 1
    ON DIM_POSITION.BASE_OBJECT_H_KEY = bridge.POSITION_HKEY

JOIN {{ ref('dim_account_executive_curr') }} DIM_USER_AE  --Object: Dimension Type 1
    ON DIM_USER_AE.BASE_OBJECT_H_KEY = bridge.USER_HKEY_AE

JOIN {{ ref('dim_assigned_recruiter_curr') }} DIM_USER_AR --Object: Dimension Type 1
    ON DIM_USER_AR.BASE_OBJECT_H_KEY = bridge.USER_HKEY_AR

JOIN {{ ref('dim_match_curr') }} DIM_MATCH_SF      --Object: Dimension Type 1
    ON DIM_MATCH_SF.BASE_OBJECT_H_KEY = bridge.match_hkey_sf

JOIN {{ ref('dim_recordtype_curr') }} DIM_RECORDTYPE      --Object: Dimension Type 1
    ON DIM_RECORDTYPE.BASE_OBJECT_H_KEY = bridge.RECORDTYPE_HKEY

-- CURRENT ACTIVE LINK RELATIONSHIP  --add the rest from the bridge
JOIN {{ ref('lna_placement_candidate__placement_hkey_curr') }} lpca --Object: Current Active Relationship Link
    ON lpca.LNA_PLACEMENT_CANDIDATE_HKEY = bridge.LNA_PLACEMENT_CANDIDATE_HKEY

JOIN {{ ref('lnk_placement_position__placement_hkey_curr') }} lpco --Object: Current Active Relationship Link
    ON lpco.LNK_PLACEMENT_POSITION_HKEY = bridge.LNK_PLACEMENT_POSITION_HKEY

JOIN {{ ref('lna_position_contact_tr1contactc__position_hkey_curr') }} lplc --Object: Current Active Relationship Link
    ON lplc.LNA_POSITION_CONTACT_TR1CONTACTC_HKEY = bridge.LNA_POSITION_CONTACT_TR1CONTACTC_HKEY

JOIN {{ ref('lna_placement_company__placement_hkey_curr') }} lpcc --Object: Current Active Relationship Link
    ON lpcc.LNA_PLACEMENT_COMPANY_HKEY = bridge.LNA_PLACEMENT_COMPANY_HKEY

JOIN {{ ref('lna_placement_match__placement_hkey_curr') }} lpmc --Object: Current Active Relationship Link
    ON lpmc.LNA_PLACEMENT_MATCH_HKEY = bridge.LNA_PLACEMENT_MATCH_HKEY

JOIN {{ ref('lna_placement_user_assignedrecruiterc__placement_hkey_curr') }} lpar --Object: Current Active Relationship Link
    ON lpar.LNA_PLACEMENT_USER_ASSIGNEDRECRUITERC_HKEY = bridge.LNA_PLACEMENT_USER_ASSIGNEDRECRUITERC_HKEY

JOIN {{ ref('lna_placement_user_placementjobownerc__placement_hkey_curr') }} lpph --Object: Current Active Relationship Link
    ON lpph.LNA_PLACEMENT_USER_PLACEMENTJOBOWNERC_HKEY = bridge.LNA_PLACEMENT_USER_PLACEMENTJOBOWNERC_HKEY

JOIN {{ ref('lnk_placement_match__placement_hkey_curr') }} lpmk --Object: Current Active Relationship Link
    ON lpmk.LNK_PLACEMENT_MATCH_HKEY = bridge.LNK_PLACEMENT_MATCH_HKEY

JOIN {{ ref('lnk_match_hrrepresentative_accountexecid__match_hkey_curr') }} lmha --Object: Current Active Relationship Link
    ON lmha.LNK_MATCH_HRREPRESENTATIVE_ACCOUNTEXECID_HKEY = bridge.LNK_MATCH_HRREPRESENTATIVE_ACCOUNTEXECID_HKEY

JOIN {{ ref('lnk_match_hrrepresentative_currentcandidateownerid__match_hkey_curr') }} lmhc --Object: Current Active Relationship Link
    ON lmhc.LNK_MATCH_HRREPRESENTATIVE_CURRENTCANDIDATEOWNERID_HKEY = bridge.LNK_MATCH_HRREPRESENTATIVE_CURRENTCANDIDATEOWNERID_HKEY

JOIN {{ ref('lna_placement_recordtype__placement_hkey_curr') }} lprt --Object: Current Active Relationship Link
    ON lprt.LNA_PLACEMENT_RECORDTYPE_HKEY = bridge.LNA_PLACEMENT_RECORDTYPE_HKEY