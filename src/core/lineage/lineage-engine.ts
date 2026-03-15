import { DirectedGraph } from '../graph/directed-graph.js';
import type { LineageProvider, LineageNode, LineageEdge } from './types.js';

/**
 * Unifies multiple lineage providers into a single directed graph.
 */
export class LineageEngine {
  private _providers: LineageProvider[] = [];
  private _graph: DirectedGraph<LineageNode, LineageEdge> | null = null;

  registerProvider(provider: LineageProvider): void {
    this._providers.push(provider);
    this._graph = null; // Invalidate cache
  }

  /** Build the unified lineage graph from all providers */
  build(): DirectedGraph<LineageNode, LineageEdge> {
    if (this._graph) return this._graph;

    const graph = new DirectedGraph<LineageNode, LineageEdge>();

    // Discover all nodes from all providers
    for (const provider of this._providers) {
      const nodes = provider.discover();
      for (const node of nodes) {
        graph.addNode(node.id, node);
      }
    }

    // Resolve dependencies
    for (const provider of this._providers) {
      const nodes = provider.discover();
      for (const node of nodes) {
        const deps = provider.dependencies(node.id);
        for (const depId of deps) {
          if (graph.hasNode(depId)) {
            graph.addEdge(depId, node.id, { type: 'ref' });
          }
        }
      }
    }

    this._graph = graph;
    return graph;
  }

  /** Invalidate the cached graph */
  invalidate(): void {
    this._graph = null;
  }
}
