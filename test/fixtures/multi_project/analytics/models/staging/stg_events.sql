with source as (

    select * from {{ source('warehouse', 'fct_events') }}

),

renamed as (

    select
        event_id,
        user_id,
        event_type,
        occurred_at,
        date_trunc('day', occurred_at) as event_date

    from source

)

select * from renamed
