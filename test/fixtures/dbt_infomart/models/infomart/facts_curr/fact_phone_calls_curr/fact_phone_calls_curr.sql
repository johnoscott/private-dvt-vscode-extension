Select 
     dim_user.dim_user_hkey as dim_user_hkey
   , hu.user_bk as user_bk
   , cm.airbyte_date
   , cm.fact_date
   , cm.duration
   , cm.call_count
   , cm.call_result
FROM {{ ref('lna_zoomphoneactivity_user_emailupper') }} lna
join {{ source('eli_dv_bv', 'hub_user') }} hu 
   on lna.user_hkey = hu.user_hkey
join {{ ref('sat_zm_zoom_phone_activity_curr_metric') }} cm
   on lna.zoom_phone_activity_hkey=cm.zoom_phone_activity_hkey
join {{ ref('dim_user_curr') }} dim_user
   on lna.user_hkey= dim_user.base_object_h_key