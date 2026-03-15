select distinct a.segment
from {{ source('eli_dv_bv', 'sat_bh4sf_placement') }} a
where a.segment is not null

union

select distinct sbu.name
from {{ source('eli_dv_bv', 'sat_sk_kimbleone__performanceanalysis__c') }} spa
join {{ source('eli_dv_bv', 'lnk_kimbleoneperformanceanalysisc_kimbleonebusinessunitc') }} lpabu
     ON spa.kimbleone__performanceanalysis__c_hkey = lpabu.kimbleone__performanceanalysis__c_hkey
join {{ source('eli_dv_bv', 'sat_sk_kimbleone__businessunit__c') }} sbu
     ON lpabu.kimbleone__businessunit__c_hkey = sbu.kimbleone__businessunit__c_hkey