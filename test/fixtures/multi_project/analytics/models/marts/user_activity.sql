with users as (

    select * from {{ ref('stg_users') }}

),

events as (

    select * from {{ ref('stg_events') }}

),

user_events as (

    select
        users.user_id,
        users.email,
        users.signup_month,
        count(events.event_id) as total_events,
        count(distinct events.event_date) as active_days,
        min(events.occurred_at) as first_event,
        max(events.occurred_at) as last_event

    from users
    left join events on users.user_id = events.user_id
    group by users.user_id, users.email, users.signup_month

)

select * from user_events
