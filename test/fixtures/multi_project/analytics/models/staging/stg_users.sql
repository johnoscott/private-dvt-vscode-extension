with source as (

    select * from {{ source('warehouse', 'dim_users') }}

),

renamed as (

    select
        user_id,
        email,
        created_at,
        date_trunc('month', created_at) as signup_month

    from source

)

select * from renamed
