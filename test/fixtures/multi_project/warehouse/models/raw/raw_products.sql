with source as (

    select * from {{ source('app_db', 'products') }}

),

cleaned as (

    select
        id as product_id,
        trim(name) as product_name,
        trim(category) as category,
        price / 100.0 as price

    from source
    where id is not null

)

select * from cleaned
