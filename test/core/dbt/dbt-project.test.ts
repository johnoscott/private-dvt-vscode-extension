import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { DbtProject } from '@core/dbt/dbt-project';

const FIXTURES = path.resolve(__dirname, '../../fixtures');
const JAFFLE_SHOP = path.join(FIXTURES, 'jaffle_shop');
const DBT_INFOMART = path.join(FIXTURES, 'dbt_infomart');
const DBT_UAT = path.join(FIXTURES, 'dbt_infomart_uat_validations_v3_hub_and_sat');

describe('DbtProject', () => {
  describe('jaffle_shop (small project)', () => {
    const project = new DbtProject(JAFFLE_SHOP);

    it('parses dbt_project.yml config', () => {
      const config = project.config();
      expect(config.name).toBe('jaffle_shop');
      expect(config.profile).toBe('jaffle_shop');
      expect(config.modelPaths).toEqual(['models']);
      expect(config.seedPaths).toEqual(['seeds']);
      expect(config.macroPaths).toEqual(['macros']);
    });

    it('discovers all models (only from model-paths, not macros/tests)', () => {
      const models = project.models();
      const names = Array.from(models.keys()).sort();
      // Only models under models/ — macros and tests are separate
      expect(names).toEqual([
        'customers',
        'orders',
        'stg_customers',
        'stg_orders',
        'stg_payments',
      ]);
    });

    it('extracts refs from customers model', () => {
      const refs = project.refsFor('customers');
      const refNames = refs.filter((r) => r.type === 'ref').map((r) => r.name).sort();
      expect(refNames).toEqual(['stg_customers', 'stg_orders', 'stg_payments']);
    });

    it('extracts sources from staging models', () => {
      const refs = project.refsFor('stg_orders');
      expect(refs).toContainEqual({
        type: 'source',
        name: 'jaffle_shop',
        table: 'raw_orders',
      });
    });

    it('discovers sources from YAML', () => {
      const sources = project.sources();
      expect(sources.size).toBeGreaterThan(0);

      const orderSource = sources.get('source.jaffle_shop.jaffle_shop.raw_orders');
      expect(orderSource).toBeDefined();
      expect(orderSource!.sourceName).toBe('jaffle_shop');
      expect(orderSource!.tableName).toBe('raw_orders');
    });

    it('builds dependency map', () => {
      const deps = project.dependencyMap();

      expect(deps.get('customers')!.sort()).toEqual([
        'stg_customers',
        'stg_orders',
        'stg_payments',
      ]);
      expect(deps.get('orders')!.sort()).toEqual(['stg_orders', 'stg_payments']);
      expect(deps.get('stg_orders')).toEqual([]); // sources are not refs
    });
  });

  describe('dbt_infomart (large project)', () => {
    const project = new DbtProject(DBT_INFOMART);

    it('parses dbt_project.yml config', () => {
      const config = project.config();
      expect(config.name).toBe('dbt_infomart');
      expect(config.modelPaths).toEqual(['models']);
    });

    it('discovers hundreds of models', () => {
      const models = project.models();
      expect(models.size).toBeGreaterThan(600);
    });

    it('handles source references in models', () => {
      const models = project.models();
      // dim_division references source('eli_dv_bv', 'sat_bh4sf_placement')
      const dimDivision = models.get('dim_division');
      expect(dimDivision).toBeDefined();
      const sourceRefs = dimDivision!.refs.filter((r) => r.type === 'source');
      expect(sourceRefs.length).toBeGreaterThan(0);
      expect(sourceRefs[0].name).toBe('eli_dv_bv');
    });

    it('discovers sources from large YAML files', () => {
      const sources = project.sources();
      // Should find sources from eli_dv_bv.yml, eli_dv_rv.yml, bh1_mtd.yml, etc.
      expect(sources.size).toBeGreaterThan(50);
    });

    it('parses within reasonable time', () => {
      const start = performance.now();
      const freshProject = new DbtProject(DBT_INFOMART);
      freshProject.models();
      freshProject.sources();
      const elapsed = performance.now() - start;
      // Should parse 600+ models in under 5 seconds
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('dbt_infomart_uat (validation project)', () => {
    const project = new DbtProject(DBT_UAT);

    it('parses config', () => {
      const config = project.config();
      expect(config.name).toBe('dbt_infomart_uat_validations_v3');
    });

    it('discovers validation models', () => {
      const models = project.models();
      expect(models.size).toBeGreaterThan(80);

      // Should find the chunk models
      const chunkModels = Array.from(models.keys()).filter((n) =>
        n.startsWith('val_hub_and_sat_chunk'),
      );
      expect(chunkModels.length).toBe(8);
    });

    it('finds the report model that depends on chunks', () => {
      const refs = project.refsFor('val_hub_and_sat_report');
      const refNames = refs.filter((r) => r.type === 'ref').map((r) => r.name);
      expect(refNames.length).toBe(8);
      expect(refNames.every((n) => n.startsWith('val_hub_and_sat_chunk'))).toBe(true);
    });

    it('discovers sources', () => {
      const sources = project.sources();
      expect(sources.size).toBeGreaterThan(0);
    });
  });
});
