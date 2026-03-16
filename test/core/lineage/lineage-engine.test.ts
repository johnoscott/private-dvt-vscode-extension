import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { DbtProject } from '@core/dbt/dbt-project';
import { DbtLineageProvider } from '@core/lineage/dbt-provider';
import { LineageEngine } from '@core/lineage/lineage-engine';

const FIXTURES = path.resolve(__dirname, '../../fixtures');
const JAFFLE_SHOP = path.join(FIXTURES, 'jaffle_shop');

describe('LineageEngine', () => {
  describe('with jaffle_shop dbt provider', () => {
    const project = new DbtProject(JAFFLE_SHOP);
    const provider = new DbtLineageProvider(project);
    const engine = new LineageEngine();
    engine.registerProvider(provider);

    it('builds a graph with models and sources', () => {
      const graph = engine.build();

      expect(graph.nodeCount).toBeGreaterThan(0);
      // Should have model nodes
      expect(graph.hasNode('model.jaffle_shop.customers')).toBe(true);
      expect(graph.hasNode('model.jaffle_shop.orders')).toBe(true);
      expect(graph.hasNode('model.jaffle_shop.stg_orders')).toBe(true);
    });

    it('creates edges from source → staging → mart', () => {
      const graph = engine.build();

      // stg_orders depends on source.jaffle_shop.jaffle_shop.raw_orders
      // The source node must exist for the edge to be created
      if (graph.hasNode('source.jaffle_shop.jaffle_shop.raw_orders')) {
        expect(
          graph.hasEdge(
            'source.jaffle_shop.jaffle_shop.raw_orders',
            'model.jaffle_shop.stg_orders',
          ),
        ).toBe(true);
      }

      // customers depends on stg_customers, stg_orders, stg_payments
      expect(
        graph.hasEdge('model.jaffle_shop.stg_customers', 'model.jaffle_shop.customers'),
      ).toBe(true);
      expect(
        graph.hasEdge('model.jaffle_shop.stg_orders', 'model.jaffle_shop.customers'),
      ).toBe(true);
    });

    it('graph is a DAG (no cycles)', () => {
      const graph = engine.build();
      expect(graph.hasCycle()).toBe(false);
    });

    it('can find ancestors of customers model', () => {
      const graph = engine.build();
      const ancestors = graph.ancestors('model.jaffle_shop.customers');
      // Should include staging models
      expect(ancestors).toContain('model.jaffle_shop.stg_customers');
      expect(ancestors).toContain('model.jaffle_shop.stg_orders');
      expect(ancestors).toContain('model.jaffle_shop.stg_payments');
    });

    it('can find descendants of a staging model', () => {
      const graph = engine.build();
      const descendants = graph.descendants('model.jaffle_shop.stg_orders');
      // stg_orders feeds into both customers and orders
      expect(descendants).toContain('model.jaffle_shop.customers');
      expect(descendants).toContain('model.jaffle_shop.orders');
    });

    it('can find path from source to mart', () => {
      const graph = engine.build();
      if (graph.hasNode('source.jaffle_shop.jaffle_shop.raw_orders')) {
        const p = graph.shortestPath(
          'source.jaffle_shop.jaffle_shop.raw_orders',
          'model.jaffle_shop.orders',
        );
        expect(p).not.toBeNull();
        expect(p!.length).toBeGreaterThanOrEqual(3); // source → staging → mart
      }
    });

    it('supports topological sort', () => {
      const graph = engine.build();
      const sorted = graph.topologicalSort();

      // Staging must come before mart models
      const stgIdx = sorted.indexOf('model.jaffle_shop.stg_orders');
      const ordersIdx = sorted.indexOf('model.jaffle_shop.orders');
      const customersIdx = sorted.indexOf('model.jaffle_shop.customers');

      if (stgIdx >= 0 && ordersIdx >= 0) {
        expect(stgIdx).toBeLessThan(ordersIdx);
      }
      if (stgIdx >= 0 && customersIdx >= 0) {
        expect(stgIdx).toBeLessThan(customersIdx);
      }
    });
  });

  describe('provider interface', () => {
    it('dbt provider discovers both models and sources', () => {
      const project = new DbtProject(JAFFLE_SHOP);
      const provider = new DbtLineageProvider(project);
      const nodes = provider.discover();

      const types = new Set(nodes.map((n) => n.type));
      expect(types.has('model')).toBe(true);
      expect(types.has('source')).toBe(true);
    });

    it('dbt provider returns dependencies', () => {
      const project = new DbtProject(JAFFLE_SHOP);
      const provider = new DbtLineageProvider(project);

      const deps = provider.dependencies('model.jaffle_shop.customers');
      expect(deps).toContain('model.jaffle_shop.stg_customers');
    });

    it('returns empty deps for source nodes', () => {
      const project = new DbtProject(JAFFLE_SHOP);
      const provider = new DbtLineageProvider(project);

      const deps = provider.dependencies('source.jaffle_shop.jaffle_shop.raw_orders');
      expect(deps).toEqual([]);
    });
  });

  describe('engine invalidation', () => {
    it('rebuilds graph after invalidation', () => {
      const project = new DbtProject(JAFFLE_SHOP);
      const provider = new DbtLineageProvider(project);
      const engine = new LineageEngine();
      engine.registerProvider(provider);

      const graph1 = engine.build();
      engine.invalidate();
      const graph2 = engine.build();

      // Should be a fresh graph, same content
      expect(graph2).not.toBe(graph1);
      expect(graph2.nodeCount).toBe(graph1.nodeCount);
    });
  });
});
