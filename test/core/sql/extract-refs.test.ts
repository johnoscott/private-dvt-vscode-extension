import { describe, it, expect } from 'vitest';
import { extractTableRefs } from '@core/sql/extract-refs';

describe('extractTableRefs', () => {
  it('extracts simple FROM reference', () => {
    const refs = extractTableRefs('SELECT * FROM users');
    expect(refs).toEqual([{ name: 'users', alias: undefined }]);
  });

  it('extracts FROM with alias', () => {
    const refs = extractTableRefs('SELECT u.id FROM users u');
    expect(refs).toEqual([{ name: 'users', alias: 'u' }]);
  });

  it('extracts FROM with AS alias', () => {
    const refs = extractTableRefs('SELECT u.id FROM users AS u');
    expect(refs).toEqual([{ name: 'users', alias: 'u' }]);
  });

  it('extracts schema-qualified table', () => {
    const refs = extractTableRefs('SELECT * FROM public.users');
    expect(refs).toEqual([{ name: 'users', schema: 'public', alias: undefined }]);
  });

  it('extracts database.schema.table', () => {
    const refs = extractTableRefs('SELECT * FROM mydb.public.users');
    expect(refs).toEqual([{ name: 'users', schema: 'public', database: 'mydb', alias: undefined }]);
  });

  it('extracts JOIN references', () => {
    const refs = extractTableRefs(`
      SELECT * FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN payments p ON o.id = p.order_id
    `);
    const names = refs.map((r) => r.name);
    expect(names).toEqual(['orders', 'customers', 'payments']);
  });

  it('identifies CTE names', () => {
    const refs = extractTableRefs(`
      WITH cte_orders AS (
        SELECT * FROM raw_orders
      )
      SELECT * FROM cte_orders
    `);

    const cteRef = refs.find((r) => r.name === 'cte_orders');
    expect(cteRef?.isCte).toBe(true);

    const tableRef = refs.find((r) => r.name === 'raw_orders');
    expect(tableRef?.isCte).toBeFalsy();
  });

  it('handles multiple CTEs', () => {
    const refs = extractTableRefs(`
      WITH
        orders AS (SELECT * FROM raw_orders),
        customers AS (SELECT * FROM raw_customers)
      SELECT * FROM orders
      JOIN customers ON orders.customer_id = customers.id
    `);

    const externalRefs = refs.filter((r) => !r.isCte);
    expect(externalRefs.map((r) => r.name).sort()).toEqual(['raw_customers', 'raw_orders']);
  });

  it('works with dbt placeholder table names from jinja-strip', () => {
    const refs = extractTableRefs(
      'SELECT * FROM __dbt_ref__stg_orders JOIN __dbt_source__shop__raw_data ON 1=1',
    );
    expect(refs.map((r) => r.name)).toEqual(['__dbt_ref__stg_orders', '__dbt_source__shop__raw_data']);
  });

  it('ignores SQL keywords that look like table names', () => {
    // "SELECT * FROM (SELECT 1) AS sub" — FROM is followed by a subquery, not a table
    // But "FROM select" should not return 'select' as a table
    const refs = extractTableRefs('SELECT * FROM orders WHERE exists(SELECT 1)');
    expect(refs.map((r) => r.name)).toEqual(['orders']);
  });

  it('handles case insensitivity', () => {
    const refs = extractTableRefs('SELECT * FROM Orders JOIN Payments ON 1=1');
    expect(refs.map((r) => r.name)).toEqual(['Orders', 'Payments']);
  });
});
