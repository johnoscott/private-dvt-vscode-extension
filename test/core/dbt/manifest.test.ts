import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { DbtProject } from '@core/dbt/dbt-project';
import { buildManifest, manifestToGraph } from '@core/dbt/manifest';

const FIXTURES = path.resolve(__dirname, '../../fixtures');
const JAFFLE_SHOP = path.join(FIXTURES, 'jaffle_shop');
const DBT_INFOMART = path.join(FIXTURES, 'dbt_infomart');
const DBT_UAT = path.join(FIXTURES, 'dbt_infomart_uat_validations_v3_hub_and_sat');

describe('buildManifest', () => {
  describe('jaffle_shop', () => {
    const project = new DbtProject(JAFFLE_SHOP);
    const manifest = buildManifest(project);

    it('has correct project metadata', () => {
      expect(manifest.version).toBe(1);
      expect(manifest.project.name).toBe('jaffle_shop');
      expect(manifest.project.profile).toBe('jaffle_shop');
      expect(manifest.generatedAt).toBeTruthy();
    });

    it('contains all model nodes', () => {
      expect(manifest.stats.modelCount).toBe(5);
      expect(manifest.nodes['model.jaffle_shop.customers']).toBeDefined();
      expect(manifest.nodes['model.jaffle_shop.orders']).toBeDefined();
      expect(manifest.nodes['model.jaffle_shop.stg_customers']).toBeDefined();
      expect(manifest.nodes['model.jaffle_shop.stg_orders']).toBeDefined();
      expect(manifest.nodes['model.jaffle_shop.stg_payments']).toBeDefined();
    });

    it('contains source nodes', () => {
      expect(manifest.stats.sourceCount).toBe(3);
      expect(manifest.sources['source.jaffle_shop.jaffle_shop.raw_customers']).toBeDefined();
      expect(manifest.sources['source.jaffle_shop.jaffle_shop.raw_orders']).toBeDefined();
      expect(manifest.sources['source.jaffle_shop.jaffle_shop.raw_payments']).toBeDefined();
    });

    it('builds correct edges', () => {
      // customers depends on stg_customers, stg_orders, stg_payments
      const customerEdges = manifest.edges.filter(
        (e) => e.to === 'model.jaffle_shop.customers',
      );
      expect(customerEdges.map((e) => e.from).sort()).toEqual([
        'model.jaffle_shop.stg_customers',
        'model.jaffle_shop.stg_orders',
        'model.jaffle_shop.stg_payments',
      ]);

      // stg_orders depends on source.jaffle_shop.jaffle_shop.raw_orders
      const stgOrderEdges = manifest.edges.filter(
        (e) => e.to === 'model.jaffle_shop.stg_orders',
      );
      expect(stgOrderEdges).toContainEqual({
        from: 'source.jaffle_shop.jaffle_shop.raw_orders',
        to: 'model.jaffle_shop.stg_orders',
      });
    });

    it('sets folder paths correctly', () => {
      expect(manifest.nodes['model.jaffle_shop.customers'].folder).toBe('marts');
      expect(manifest.nodes['model.jaffle_shop.stg_orders'].folder).toBe('staging');
    });

    it('includes file paths', () => {
      const customers = manifest.nodes['model.jaffle_shop.customers'];
      expect(customers.filePath).toContain('jaffle_shop');
      expect(customers.filePath).toMatch(/customers\.sql$/);
      expect(customers.relativePath).toBe('marts/customers.sql');
    });

    it('is JSON-serializable', () => {
      const json = JSON.stringify(manifest);
      const parsed = JSON.parse(json);
      expect(parsed.project.name).toBe('jaffle_shop');
      expect(parsed.stats.modelCount).toBe(5);
    });
  });

  describe('dbt_infomart (large project)', () => {
    const project = new DbtProject(DBT_INFOMART);

    it('builds manifest for 600+ models', () => {
      const start = performance.now();
      const manifest = buildManifest(project);
      const elapsed = performance.now() - start;

      expect(manifest.stats.modelCount).toBeGreaterThan(600);
      expect(manifest.stats.sourceCount).toBeGreaterThan(50);
      expect(manifest.stats.edgeCount).toBeGreaterThan(0);
      // Should be fast — under 5 seconds including YAML parsing
      expect(elapsed).toBeLessThan(5000);
    });

    it('has correct folder structure in nodes', () => {
      const manifest = buildManifest(project);
      const dimDivision = manifest.nodes['model.dbt_infomart.dim_division'];
      expect(dimDivision).toBeDefined();
      expect(dimDivision.folder).toContain('dims_curr');
    });
  });

  describe('dbt_infomart_uat (validation project)', () => {
    const project = new DbtProject(DBT_UAT);

    it('builds manifest with chunk → report edges', () => {
      const manifest = buildManifest(project);
      const reportEdges = manifest.edges.filter(
        (e) => e.to === 'model.dbt_infomart_uat_validations_v3.val_hub_and_sat_report',
      );
      // Report depends on 8 chunks
      expect(reportEdges.length).toBe(8);
      expect(
        reportEdges.every((e) => e.from.includes('val_hub_and_sat_chunk')),
      ).toBe(true);
    });
  });
});

describe('manifestToGraph', () => {
  it('builds a traversable graph from manifest', () => {
    const project = new DbtProject(JAFFLE_SHOP);
    const manifest = buildManifest(project);
    const graph = manifestToGraph(manifest);

    expect(graph.nodeCount).toBe(manifest.stats.modelCount + manifest.stats.sourceCount);
    expect(graph.edgeCount).toBe(manifest.stats.edgeCount);
    expect(graph.hasCycle()).toBe(false);

    // Can traverse: ancestors of customers
    const ancestors = graph.ancestors('model.jaffle_shop.customers');
    expect(ancestors).toContain('model.jaffle_shop.stg_customers');
  });

  it('round-trips through JSON', () => {
    const project = new DbtProject(JAFFLE_SHOP);
    const manifest = buildManifest(project);

    // Serialize and deserialize
    const json = JSON.stringify(manifest);
    const restored = JSON.parse(json);
    const graph = manifestToGraph(restored);

    expect(graph.nodeCount).toBe(manifest.stats.modelCount + manifest.stats.sourceCount);
    expect(graph.hasEdge('model.jaffle_shop.stg_orders', 'model.jaffle_shop.customers')).toBe(
      true,
    );
  });
});
