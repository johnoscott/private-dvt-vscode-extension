with events as (

    select * from {{ ref('raw_events') }}

),

users as (

    select * from {{ ref('dim_users') }}

),

final as (

    select
        events.event_id,
        events.user_id,
        events.event_type,
        events.properties,
        events.occurred_at,
        users.email as user_email,
        users.cohort_month as user_cohort

    from events
    left join users on events.user_id = users.user_id

)

select * from final
