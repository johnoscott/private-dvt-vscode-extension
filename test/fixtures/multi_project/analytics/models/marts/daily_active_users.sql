with events as (

    select * from {{ ref('stg_events') }}

),

daily_users as (

    select
        event_date,
        count(distinct user_id) as active_users,
        count(event_id) as total_events

    from events
    group by event_date

)

select * from daily_users
