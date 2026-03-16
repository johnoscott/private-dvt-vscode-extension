select distinct a.domain
from {{ source('eli_dv_bv', 'sat_bh4sf_placement') }} a
where a.domain is not null

union

select distinct dm.new_domain
from {{ source('eli_dv_bv', 'sat_sk_kimbleone__performanceanalysis__c') }} spa
join {{ source('eli_dv_bv', 'lnk_kimbleoneperformanceanalysisc_kimbleonebusinessunitc') }} lpabu
     ON spa.kimbleone__performanceanalysis__c_hkey = lpabu.kimbleone__performanceanalysis__c_hkey
join {{ source('eli_dv_bv', 'sat_sk_kimbleone__businessunit__c') }} sbu
     ON lpabu.kimbleone__businessunit__c_hkey = sbu.kimbleone__businessunit__c_hkey
join {{ source('eli_dv_bv', 'lnk_kimbleonebusinessunitc_kimbleonebusinessunitc_kimbleonebusinessunitc') }} lnkbu
     ON sbu.kimbleone__businessunit__c_hkey = lnkbu.kimbleone__businessunit__c_hkey
join {{ source('eli_dv_bv', 'sat_sk_kimbleone__businessunit__c') }} spbu
     ON lnkbu.kimbleone__businessunit__c_kimbleonebusinessunitc_hkey = spbu.kimbleone__businessunit__c_hkey
JOIN ELIASSEN_DW.REFERENCE_TABLES.REF_DOMAIN_MAP dm
     ON spbu.name = dm.domain

UNION

Select 'Richmond'

UNION

Select 'eClinical'

UNION 

Select 'Texas'