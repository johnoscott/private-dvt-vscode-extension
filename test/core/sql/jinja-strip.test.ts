import { describe, it, expect } from 'vitest';
import { stripJinja } from '@core/sql/jinja-strip';

describe('stripJinja', () => {
  it('replaces ref() with placeholder table name', () => {
    const sql = `select * from {{ ref('stg_orders') }}`;
    const result = stripJinja(sql);

    expect(result.sql).toBe(`select * from __dbt_ref__stg_orders`);
    expect(result.refs).toEqual([
      { type: 'ref', model: 'stg_orders', placeholder: '__dbt_ref__stg_orders' },
    ]);
  });

  it('replaces source() with placeholder table name', () => {
    const sql = `select * from {{ source('jaffle_shop', 'raw_orders') }}`;
    const result = stripJinja(sql);

    expect(result.sql).toBe(`select * from __dbt_source__jaffle_shop__raw_orders`);
    expect(result.refs).toEqual([
      {
        type: 'source',
        source: 'jaffle_shop',
        table: 'raw_orders',
        placeholder: '__dbt_source__jaffle_shop__raw_orders',
      },
    ]);
  });

  it('handles multiple refs and sources', () => {
    const sql = `
      with orders as (
        select * from {{ ref('stg_orders') }}
      ),
      payments as (
        select * from {{ ref('stg_payments') }}
      ),
      raw as (
        select * from {{ source('shop', 'raw_data') }}
      )
      select * from orders join payments on orders.id = payments.order_id
    `;
    const result = stripJinja(sql);

    expect(result.refs).toHaveLength(3);
    expect(result.refs[0]).toMatchObject({ type: 'ref', model: 'stg_orders' });
    expect(result.refs[1]).toMatchObject({ type: 'ref', model: 'stg_payments' });
    expect(result.refs[2]).toMatchObject({ type: 'source', source: 'shop', table: 'raw_data' });
  });

  it('removes Jinja comments', () => {
    const sql = `select * {# this is a comment #} from table1`;
    const result = stripJinja(sql);
    expect(result.sql).toBe(`select *  from table1`);
  });

  it('removes Jinja block tags', () => {
    const sql = `{% if target.name == 'prod' %}select 1{% else %}select 2{% endif %}`;
    const result = stripJinja(sql);
    expect(result.sql).toBe(`select 1select 2`);
  });

  it('replaces unknown expressions with placeholder', () => {
    const sql = `select * from {{ var('schema') }}.table1`;
    const result = stripJinja(sql);
    expect(result.sql).toBe(`select * from __jinja_expr.table1`);
  });

  it('handles double-quoted strings in ref/source', () => {
    const sql = `select * from {{ ref("my_model") }}`;
    const result = stripJinja(sql);
    expect(result.refs).toEqual([
      { type: 'ref', model: 'my_model', placeholder: '__dbt_ref__my_model' },
    ]);
  });

  it('handles whitespace variations in ref/source', () => {
    const sql = `select * from {{ref('model1')}} join {{  ref( 'model2' )  }}`;
    const result = stripJinja(sql);
    expect(result.refs).toHaveLength(2);
  });
});
