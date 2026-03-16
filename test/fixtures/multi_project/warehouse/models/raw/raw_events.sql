with source as (

    select * from {{ source('app_db', 'events') }}

),

cleaned as (

    select
        id as event_id,
        user_id,
        type as event_type,
        properties,
        timestamp as occurred_at

    from source
    where id is not null

)

select * from cleaned
