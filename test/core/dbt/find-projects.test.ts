import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { findDbtProjectsInDir, findProjectRoot } from '@core/dbt/find-projects';

const FIXTURES = path.resolve(__dirname, '../../fixtures');

describe('findDbtProjectsInDir', () => {
  it('finds jaffle_shop as a single project', () => {
    const projects = findDbtProjectsInDir(path.join(FIXTURES, 'jaffle_shop'));
    expect(projects).toEqual([path.join(FIXTURES, 'jaffle_shop')]);
  });

  it('finds all projects in fixtures directory', () => {
    const projects = findDbtProjectsInDir(FIXTURES);
    expect(projects.length).toBeGreaterThanOrEqual(4); // jaffle, infomart, uat, multi(2)
  });

  it('finds two projects in multi_project fixture', () => {
    const projects = findDbtProjectsInDir(path.join(FIXTURES, 'multi_project'));
    const names = projects.map((p) => path.basename(p)).sort();
    expect(names).toEqual(['analytics', 'warehouse']);
  });

  it('does not recurse into dbt project subdirectories', () => {
    // jaffle_shop has models/ with sql files but no nested dbt_project.yml
    const projects = findDbtProjectsInDir(path.join(FIXTURES, 'jaffle_shop'));
    expect(projects.length).toBe(1);
  });

  it('skips common non-project directories', () => {
    // Should not search into node_modules, .git, target, etc.
    const projects = findDbtProjectsInDir(FIXTURES, 1);
    // Should still find top-level projects
    expect(projects.length).toBeGreaterThan(0);
  });
});

describe('findProjectRoot', () => {
  it('finds project root from a model file', () => {
    const modelFile = path.join(FIXTURES, 'jaffle_shop', 'models', 'marts', 'customers.sql');
    const root = findProjectRoot(modelFile);
    expect(root).toBe(path.join(FIXTURES, 'jaffle_shop'));
  });

  it('finds project root from the project directory itself', () => {
    const root = findProjectRoot(path.join(FIXTURES, 'jaffle_shop'));
    expect(root).toBe(path.join(FIXTURES, 'jaffle_shop'));
  });

  it('finds correct project root in multi-project setup', () => {
    const analyticsModel = path.join(
      FIXTURES, 'multi_project', 'analytics', 'models', 'marts', 'user_activity.sql',
    );
    const root = findProjectRoot(analyticsModel);
    expect(root).toBe(path.join(FIXTURES, 'multi_project', 'analytics'));
  });

  it('finds warehouse project root (not analytics)', () => {
    const warehouseModel = path.join(
      FIXTURES, 'multi_project', 'warehouse', 'models', 'transform', 'dim_users.sql',
    );
    const root = findProjectRoot(warehouseModel);
    expect(root).toBe(path.join(FIXTURES, 'multi_project', 'warehouse'));
  });

  it('returns null when no project found', () => {
    const root = findProjectRoot('/tmp');
    expect(root).toBeNull();
  });

  it('respects stopAt boundary', () => {
    const modelFile = path.join(FIXTURES, 'jaffle_shop', 'models', 'marts', 'customers.sql');
    // Stop at a directory above the project — should still find it
    const root = findProjectRoot(modelFile, FIXTURES);
    expect(root).toBe(path.join(FIXTURES, 'jaffle_shop'));
  });
});
