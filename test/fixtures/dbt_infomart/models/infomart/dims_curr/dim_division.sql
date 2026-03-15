select distinct a.division
from {{ source('eli_dv_bv', 'sat_bh4sf_placement') }} a
where a.division is not null