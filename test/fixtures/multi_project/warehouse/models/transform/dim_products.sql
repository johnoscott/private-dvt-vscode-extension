with products as (

    select * from {{ ref('raw_products') }}

),

final as (

    select
        product_id,
        product_name,
        category,
        price

    from products

)

select * from final
