with source as (

    select * from {{ source('app_db', 'users') }}

),

cleaned as (

    select
        id as user_id,
        lower(trim(email)) as email,
        trim(name) as display_name,
        created_at

    from source
    where id is not null

)

select * from cleaned
