import { DirectedGraph } from '../graph/directed-graph.js';
import type { DbtProject } from './dbt-project.js';
import type { DbtModel, DbtSource, DbtRef, DbtColumn } from './types.js';

/**
 * DVT Manifest — a lightweight alternative to dbt's manifest.json.
 * Built entirely from file parsing (dbt_project.yml + SQL files + YAML).
 * No dbt CLI, no Python, no compilation needed.
 */

export interface DvtManifest {
  /** Manifest format version */
  version: 1;
  /** When this manifest was built */
  generatedAt: string;
  /** Project metadata */
  project: {
    name: string;
    version?: string;
    profile?: string;
  };
  /** All model nodes */
  nodes: Record<string, DvtManifestNode>;
  /** All source nodes */
  sources: Record<string, DvtManifestSource>;
  /** Parent → child edges (downstream) */
  edges: Array<{ from: string; to: string }>;
  /** Summary stats */
  stats: {
    modelCount: number;
    sourceCount: number;
    edgeCount: number;
  };
}

export interface DvtManifestNode {
  id: string;
  name: string;
  filePath: string;
  relativePath: string;
  refs: DbtRef[];
  description?: string;
  materialization?: string;
  tags?: string[];
  columns?: DbtColumn[];
  /** Folder path within model-paths (e.g., "staging", "marts") */
  folder: string;
}

export interface DvtManifestSource {
  id: string;
  sourceName: string;
  tableName: string;
  description?: string;
  database?: string;
  schema?: string;
  columns?: DbtColumn[];
}

/**
 * Build a DVT manifest from a parsed dbt project.
 * This is the core function — takes a DbtProject, returns a serializable manifest.
 */
export function buildManifest(project: DbtProject): DvtManifest {
  const config = project.config();
  const models = project.models();
  const sources = project.sources();

  const nodes: Record<string, DvtManifestNode> = {};
  const manifestSources: Record<string, DvtManifestSource> = {};
  const edges: Array<{ from: string; to: string }> = [];

  // Build model nodes
  for (const [, model] of models) {
    const folder = folderFromPath(model.relativePath);
    nodes[model.id] = {
      id: model.id,
      name: model.name,
      filePath: model.filePath,
      relativePath: model.relativePath,
      refs: model.refs,
      description: model.description,
      materialization: model.materialization,
      tags: model.tags,
      columns: model.columns,
      folder,
    };
  }

  // Build source nodes
  for (const [id, source] of sources) {
    manifestSources[id] = {
      id: source.id,
      sourceName: source.sourceName,
      tableName: source.tableName,
      description: source.description,
      database: source.database,
      schema: source.schema,
      columns: source.columns,
    };
  }

  // Build edges from refs
  for (const [, model] of models) {
    for (const ref of model.refs) {
      if (ref.type === 'ref') {
        const targetId = `model.${config.name}.${ref.name}`;
        if (nodes[targetId]) {
          edges.push({ from: targetId, to: model.id });
        }
      } else if (ref.type === 'source') {
        const targetId = `source.${config.name}.${ref.name}.${ref.table}`;
        if (manifestSources[targetId]) {
          edges.push({ from: targetId, to: model.id });
        }
      }
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: {
      name: config.name,
      version: config.version,
      profile: config.profile,
    },
    nodes,
    sources: manifestSources,
    edges,
    stats: {
      modelCount: Object.keys(nodes).length,
      sourceCount: Object.keys(manifestSources).length,
      edgeCount: edges.length,
    },
  };
}

/**
 * Build a DirectedGraph from a DVT manifest.
 * Useful for graph operations after loading a cached manifest.
 */
export function manifestToGraph(
  manifest: DvtManifest,
): DirectedGraph<DvtManifestNode | DvtManifestSource, { type: string }> {
  const graph = new DirectedGraph<DvtManifestNode | DvtManifestSource, { type: string }>();

  for (const [id, node] of Object.entries(manifest.nodes)) {
    graph.addNode(id, node);
  }
  for (const [id, source] of Object.entries(manifest.sources)) {
    graph.addNode(id, source);
  }
  for (const edge of manifest.edges) {
    if (graph.hasNode(edge.from) && graph.hasNode(edge.to)) {
      graph.addEdge(edge.from, edge.to, { type: 'ref' });
    }
  }

  return graph;
}

function folderFromPath(relativePath: string): string {
  const parts = relativePath.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}
