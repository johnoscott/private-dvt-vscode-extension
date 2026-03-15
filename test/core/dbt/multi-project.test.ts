import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { DbtProject } from '@core/dbt/dbt-project';
import { buildManifest, manifestToGraph } from '@core/dbt/manifest';
import { findDbtProjectsInDir } from '@core/dbt/find-projects';

const MULTI = path.resolve(__dirname, '../../fixtures/multi_project');

describe('multi-project workspace', () => {
  const projectRoots = findDbtProjectsInDir(MULTI);

  it('discovers exactly 2 projects', () => {
    expect(projectRoots.length).toBe(2);
  });

  describe('analytics project', () => {
    const root = projectRoots.find((p) => path.basename(p) === 'analytics')!;
    const project = new DbtProject(root);
    const manifest = buildManifest(project);

    it('has correct name', () => {
      expect(manifest.project.name).toBe('analytics');
    });

    it('has 4 models', () => {
      expect(manifest.stats.modelCount).toBe(4);
      expect(manifest.nodes['model.analytics.stg_users']).toBeDefined();
      expect(manifest.nodes['model.analytics.stg_events']).toBeDefined();
      expect(manifest.nodes['model.analytics.user_activity']).toBeDefined();
      expect(manifest.nodes['model.analytics.daily_active_users']).toBeDefined();
    });

    it('has 2 sources', () => {
      expect(manifest.stats.sourceCount).toBe(2);
    });

    it('builds correct lineage', () => {
      const graph = manifestToGraph(manifest);
      // user_activity depends on stg_users and stg_events
      expect(graph.hasEdge('model.analytics.stg_users', 'model.analytics.user_activity')).toBe(true);
      expect(graph.hasEdge('model.analytics.stg_events', 'model.analytics.user_activity')).toBe(true);
      // daily_active_users depends on stg_events
      expect(graph.hasEdge('model.analytics.stg_events', 'model.analytics.daily_active_users')).toBe(true);
    });
  });

  describe('warehouse project', () => {
    const root = projectRoots.find((p) => path.basename(p) === 'warehouse')!;
    const project = new DbtProject(root);
    const manifest = buildManifest(project);

    it('has correct name', () => {
      expect(manifest.project.name).toBe('warehouse');
    });

    it('has 6 models', () => {
      expect(manifest.stats.modelCount).toBe(6);
    });

    it('has 3 sources', () => {
      expect(manifest.stats.sourceCount).toBe(3);
    });

    it('builds correct lineage: raw → transform', () => {
      const graph = manifestToGraph(manifest);
      // dim_users depends on raw_users
      expect(graph.hasEdge('model.warehouse.raw_users', 'model.warehouse.dim_users')).toBe(true);
      // fct_events depends on raw_events AND dim_users
      expect(graph.hasEdge('model.warehouse.raw_events', 'model.warehouse.fct_events')).toBe(true);
      expect(graph.hasEdge('model.warehouse.dim_users', 'model.warehouse.fct_events')).toBe(true);
    });

    it('graph has no cycles', () => {
      const graph = manifestToGraph(manifest);
      expect(graph.hasCycle()).toBe(false);
    });
  });

  describe('both projects together', () => {
    it('can build manifests for all projects independently', () => {
      const manifests = projectRoots.map((root) => {
        const project = new DbtProject(root);
        return buildManifest(project);
      });

      const totalModels = manifests.reduce((n, m) => n + m.stats.modelCount, 0);
      expect(totalModels).toBe(10); // 4 analytics + 6 warehouse
    });
  });
});
