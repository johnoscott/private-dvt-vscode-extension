SELECT DISTINCT
     DIM_COMPANY_CONTACT.DIM_COMPANY_HKEY AS DIM_COMPANY_CONTACT_HKEY
    ,DIM_COMPANY_EVENT.DIM_COMPANY_HKEY AS DIM_COMPANY_EVENT_HKEY
    ,CASE WHEN bridge.COMPANY_HKEY_EVENT_PARENT = '877EB9EC9CCF4AE650B89FF228711D1F52FA05FD8D2B09F6102EEF35A6321742' 
        then DIM_COMPANY_EVENT.DIM_COMPANY_HKEY else DIM_COMPANY_PARENT_EVENT.DIM_PARENT_COMPANY_HKEY END AS DIM_COMPANY_EVENT_PARENT_HKEY
    ,CASE WHEN bridge.COMPANY_HKEY_EVENT_PARENT = '877EB9EC9CCF4AE650B89FF228711D1F52FA05FD8D2B09F6102EEF35A6321742' 
        then DIM_COMPANY_CONTACT.DIM_COMPANY_HKEY else DIM_COMPANY_PARENT_CONTACT.DIM_PARENT_COMPANY_HKEY END AS DIM_COMPANY_CONTACT_PARENT_HKEY
    ,DIM_CONTACT.DIM_CONTACT_HKEY AS DIM_CONTACT_HKEY
    ,DIM_ACCOUNT_EXECUTIVE.DIM_ACCOUNT_EXECUTIVE_HKEY AS DIM_ACCOUNT_EXECUTIVE_HKEY
    ,IFNULL(DIM_HR_REPRESENTATIVE.BASE_OBJECT_H_KEY, '6A6EAC8D79C61ECC369732657A9D087925E358C2A9F5A08A4AB70B538E3039B0') AS HR_REPRESENTATIVE_HKEY 
    ,DIM_HR_REPRESENTATIVE.DIM_HR_REPRESENTATIVE_HKEY AS DIM_HR_REPRESENTATIVE_HKEY
    ,DIM_LEAD.DIM_LEAD_HKEY AS DIM_LEAD_HKEY
    ,bridge.COMPANY_BK_CONTACT AS COMPANY_BK_CONTACT     --Attr: Hub BK (from hub alias)
    ,bridge.COMPANY_BK_EVENT AS COMPANY_BK_EVENT         --Attr: Hub BK (from hub alias)
    ,CASE WHEN bridge.COMPANY_BK_EVENT_PARENT = '0'
        then bridge.COMPANY_BK_EVENT else bridge.COMPANY_BK_EVENT_PARENT END AS COMPANY_PARENT_EVENT_BK
    ,CASE WHEN bridge.COMPANY_BK_CONTACT_PARENT = '0'
        then bridge.COMPANY_BK_CONTACT else bridge.COMPANY_BK_CONTACT_PARENT END AS COMPANY_PARENT_CONTACT_BK 
    ,bridge.CONTACT_BK AS CONTACT_BK                     --Attr: Hub BK
    ,bridge.USER_BK AS USER_BK                           --Attr: Hub BK
    ,bridge.HR_REPRESENTATIVE_BK AS HR_REPRESENTATIVE_BK --Attr: Hub BK
    ,bridge.LEAD_ID_BK AS LEAD_ID_BK                     --Attr: Hub BK
    ,bridge.VWEVENT_ID_BK AS EVENT_BK                    --Attr: Main Hub BK (Bridge)
    ,metric_sat1.AIRBYTE_DATE                              --Attr: Transaction Indicator (Metric Sat)
    ,metric_sat1.FACT_DATE                                 --Attr: Fact Date
    ,metric_sat1.CLIENT_VISIT                           --Attr: Metric
    ,metric_sat1.COMPLETED_CLIENT_VISIT                   --Attr: Metric
    ,dt.date_key AS DATE_KEY
FROM {{ ref('brg_client_visits') }} bridge

JOIN {{ ref('sat_ssc_vw_event_curr_metric') }} metric_sat1         --Source: Metric Sat
    ON metric_sat1.VW_EVENT_HKEY = bridge.VW_EVENT_HKEY             --Join: Metric Sat Hash Key (Sat)=Hub Hash Key (Bridge)

JOIN {{ ref('dim_time') }} dt
    ON dt.date_key = metric_sat1.fact_date

JOIN {{ ref('dim_company_curr') }} DIM_COMPANY_CONTACT           --Source: Dimension Set
    ON DIM_COMPANY_CONTACT.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_CONTACT        --Join: Main Hub Hash Key (Dim)=Aliased Hub Hash Key (Bridge)

JOIN {{ ref('dim_parent_company_curr') }} DIM_COMPANY_PARENT_CONTACT  --Object: Dimension Type 1
    ON DIM_COMPANY_PARENT_CONTACT.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_CONTACT_PARENT

JOIN {{ ref('dim_company_curr') }} DIM_COMPANY_EVENT                                      --Source: Dimension Set
    ON DIM_COMPANY_EVENT.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_EVENT            --Join: Main Hub Hash Key (Dim)=Aliased Hub Hash Key (Bridge)

JOIN {{ ref('dim_parent_company_curr') }} DIM_COMPANY_PARENT_EVENT  --Object: Dimension Type 1
    ON DIM_COMPANY_PARENT_EVENT.BASE_OBJECT_H_KEY = bridge.COMPANY_HKEY_EVENT_PARENT

JOIN {{ ref('dim_contact_curr') }} DIM_CONTACT                                            --Source: Dimension Set
    ON DIM_CONTACT.BASE_OBJECT_H_KEY = bridge.CONTACT_HKEY                       --Join: Main Hub Hash Key (Dim)=Hub Hash Key (Bridge)

JOIN {{ ref('dim_account_executive_curr') }} DIM_ACCOUNT_EXECUTIVE                        --Source: Dimension Set
    ON DIM_ACCOUNT_EXECUTIVE.BASE_OBJECT_H_KEY = bridge.USER_HKEY                 --Join: Main Hub Hash Key (Dim)=Hub Hash Key (Bridge)

LEFT JOIN {{ ref('dim_hr_representative_curr') }} DIM_HR_REPRESENTATIVE                        --Source: Dimension Set
    ON DIM_HR_REPRESENTATIVE.BASE_OBJECT_H_KEY = bridge.HR_REPRESENTATIVE_HKEY     --Join: Main Hub Hash Key (Dim)=Hub Hash Key (Bridge)

JOIN {{ ref('dim_lead_curr') }} DIM_LEAD                                                  --Source: Dimension Set
    ON DIM_LEAD.BASE_OBJECT_H_KEY = bridge.LEAD_HKEY                              --Join: Main Hub Hash Key (Dim)=Hub Hash Key (Bridge)

JOIN {{ ref('lnk_contact_company__contact_hkey_curr') }} cs
    ON cs.lnk_contact_company_hkey = bridge.lnk_contact_company_hkey

JOIN {{ ref('lnk_vwevent_contact__vw_event_hkey_curr') }} csv
    ON csv.lnk_vwevent_contact_hkey = bridge.lnk_vwevent_contact_hkey

JOIN {{ ref('lnk_vwevent_company__vw_event_hkey_curr') }} csvw
    ON csvw.lnk_vwevent_company_hkey = bridge.lnk_vwevent_company_hkey

JOIN {{ ref('lnk_company_company_parentid__company_hkey_curr') }} lcpc
    ON lcpc.LNK_COMPANY_COMPANY_PARENTID_HKEY = bridge.LNK_COMPANY_COMPANY_PARENTID_HKEY_CONTACT

JOIN {{ ref('lnk_company_company_parentid__company_hkey_curr') }} lcpc2
    ON lcpc2.LNK_COMPANY_COMPANY_PARENTID_HKEY = bridge.LNK_COMPANY_COMPANY_PARENTID_HKEY_EVENT

JOIN {{ ref('lnk_vwevent_user_ownerid__vw_event_hkey_curr') }} csu
    ON csu.LNK_VWEVENT_USER_OWNERID_HKEY = bridge.LNK_VWEVENT_USER_OWNERID_HKEY

JOIN {{ ref('lnk_vwevent_lead__vw_event_hkey_curr') }} cvl
    ON cvl.LNK_VWEVENT_LEAD_HKEY = bridge.LNK_VWEVENT_LEAD_HKEY

LEFT JOIN {{ ref('lna_vwevent_scheduleditems__vw_event_hkey_curr') }} cesi
    ON cesi.LNA_VWEVENT_SCHEDULEDITEMS_HKEY = bridge.LNA_VWEVENT_SCHEDULEDITEMS_HKEY

LEFT JOIN {{ ref('lnk_scheduleditems_hrrepresentative__scheduleditems_hkey_curr') }} csihr
    ON csihr.LNK_SCHEDULEDITEMS_HRREPRESENTATIVE_HKEY = bridge.LNK_SCHEDULEDITEMS_HRREPRESENTATIVE_HKEY