import type { LineageProvider, LineageNode } from './types.js';
import type { DbtProject } from '../dbt/dbt-project.js';

/**
 * Lineage provider backed by a parsed dbt project.
 */
export class DbtLineageProvider implements LineageProvider {
  readonly id = 'dbt';
  readonly name = 'dbt Project';
  private _project: DbtProject;

  constructor(project: DbtProject) {
    this._project = project;
  }

  discover(): LineageNode[] {
    const nodes: LineageNode[] = [];

    // Add models as nodes
    for (const [, model] of this._project.models()) {
      nodes.push({
        id: model.id,
        name: model.name,
        type: 'model',
        provider: this.id,
        filePath: model.filePath,
        description: model.description,
        tags: model.tags,
        materialization: model.materialization,
      });
    }

    // Add sources as nodes
    for (const [, source] of this._project.sources()) {
      nodes.push({
        id: source.id,
        name: `${source.sourceName}.${source.tableName}`,
        type: 'source',
        provider: this.id,
        description: source.description,
      });
    }

    return nodes;
  }

  dependencies(nodeId: string): string[] {
    // Extract model name from ID: model.<project>.<name>
    const parts = nodeId.split('.');
    if (parts[0] !== 'model') return [];
    const modelName = parts[parts.length - 1];
    const projectName = parts[1];

    const refs = this._project.refsFor(modelName);
    return refs.map((ref) => {
      if (ref.type === 'ref') {
        return `model.${projectName}.${ref.name}`;
      } else {
        return `source.${projectName}.${ref.name}.${ref.table}`;
      }
    });
  }
}
