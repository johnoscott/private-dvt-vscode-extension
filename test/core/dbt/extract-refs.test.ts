import { describe, it, expect } from 'vitest';
import { extractDbtRefs } from '@core/dbt/extract-refs';

describe('extractDbtRefs', () => {
  it('extracts single ref', () => {
    const sql = `select * from {{ ref('stg_orders') }}`;
    expect(extractDbtRefs(sql)).toEqual([{ type: 'ref', name: 'stg_orders' }]);
  });

  it('extracts single source', () => {
    const sql = `select * from {{ source('jaffle_shop', 'raw_orders') }}`;
    expect(extractDbtRefs(sql)).toEqual([
      { type: 'source', name: 'jaffle_shop', table: 'raw_orders' },
    ]);
  });

  it('extracts multiple refs', () => {
    const sql = `
      with a as (select * from {{ ref('stg_orders') }}),
           b as (select * from {{ ref('stg_customers') }})
      select * from a join b on a.id = b.id
    `;
    const refs = extractDbtRefs(sql);
    expect(refs).toHaveLength(2);
    expect(refs[0].name).toBe('stg_orders');
    expect(refs[1].name).toBe('stg_customers');
  });

  it('extracts mixed refs and sources', () => {
    const sql = `
      select * from {{ ref('stg_orders') }}
      join {{ source('raw', 'customers') }} on 1=1
    `;
    const refs = extractDbtRefs(sql);
    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({ type: 'ref', name: 'stg_orders' });
    expect(refs[1]).toEqual({ type: 'source', name: 'raw', table: 'customers' });
  });

  it('handles double quotes', () => {
    const sql = `select * from {{ ref("my_model") }}`;
    expect(extractDbtRefs(sql)).toEqual([{ type: 'ref', name: 'my_model' }]);
  });

  it('returns empty for plain SQL', () => {
    expect(extractDbtRefs('select 1 from table1')).toEqual([]);
  });

  it('handles whitespace variations', () => {
    const sql = `select * from {{ref('a')}} join {{  source(  'b' , 'c'  )  }}`;
    const refs = extractDbtRefs(sql);
    expect(refs).toHaveLength(2);
  });
});
