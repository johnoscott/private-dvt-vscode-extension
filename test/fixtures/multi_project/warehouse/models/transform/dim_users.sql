with users as (

    select * from {{ ref('raw_users') }}

),

final as (

    select
        user_id,
        email,
        display_name,
        created_at,
        date_trunc('month', created_at) as cohort_month

    from users

)

select * from final
