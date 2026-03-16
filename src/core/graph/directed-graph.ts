/**
 * Pure directed graph library for DAG operations.
 * No VSCode dependencies — usable in extension, webview, CLI, and tests.
 */

export interface SerializedGraph<N = unknown, E = unknown> {
  nodes: Array<{ id: string; data: N }>;
  edges: Array<{ source: string; target: string; data: E }>;
}

export class DirectedGraph<N = unknown, E = unknown> {
  private _nodes = new Map<string, N>();
  private _outEdges = new Map<string, Map<string, E>>(); // source -> target -> data
  private _inEdges = new Map<string, Set<string>>(); // target -> sources

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const targets of this._outEdges.values()) {
      count += targets.size;
    }
    return count;
  }

  hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  getNode(id: string): N | undefined {
    return this._nodes.get(id);
  }

  nodeIds(): string[] {
    return Array.from(this._nodes.keys());
  }

  addNode(id: string, data: N): void {
    this._nodes.set(id, data);
    if (!this._outEdges.has(id)) this._outEdges.set(id, new Map());
    if (!this._inEdges.has(id)) this._inEdges.set(id, new Set());
  }

  removeNode(id: string): void {
    // Remove all edges involving this node
    const outTargets = this._outEdges.get(id);
    if (outTargets) {
      for (const target of outTargets.keys()) {
        this._inEdges.get(target)?.delete(id);
      }
    }
    const inSources = this._inEdges.get(id);
    if (inSources) {
      for (const source of inSources) {
        this._outEdges.get(source)?.delete(id);
      }
    }
    this._nodes.delete(id);
    this._outEdges.delete(id);
    this._inEdges.delete(id);
  }

  hasEdge(source: string, target: string): boolean {
    return this._outEdges.get(source)?.has(target) ?? false;
  }

  addEdge(source: string, target: string, data: E): void {
    if (!this._nodes.has(source)) throw new Error(`Node not found: ${source}`);
    if (!this._nodes.has(target)) throw new Error(`Node not found: ${target}`);
    this._outEdges.get(source)!.set(target, data);
    this._inEdges.get(target)!.add(source);
  }

  removeEdge(source: string, target: string): void {
    this._outEdges.get(source)?.delete(target);
    this._inEdges.get(target)?.delete(source);
  }

  /** Direct children (nodes this node points to) */
  successors(id: string): string[] {
    const targets = this._outEdges.get(id);
    return targets ? Array.from(targets.keys()) : [];
  }

  /** Direct parents (nodes pointing to this node) */
  predecessors(id: string): string[] {
    const sources = this._inEdges.get(id);
    return sources ? Array.from(sources) : [];
  }

  /** All downstream nodes (BFS) up to maxDepth */
  descendants(id: string, maxDepth?: number): string[] {
    return this._bfs(id, 'successors', maxDepth);
  }

  /** All upstream nodes (BFS) up to maxDepth */
  ancestors(id: string, maxDepth?: number): string[] {
    return this._bfs(id, 'predecessors', maxDepth);
  }

  /** Shortest path using BFS. Returns node IDs including start and end, or null if no path. */
  shortestPath(from: string, to: string): string[] | null {
    if (from === to) return [from];
    const visited = new Set<string>([from]);
    const parent = new Map<string, string>();
    const queue: string[] = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of this.successors(current)) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, current);
        if (next === to) {
          // Reconstruct path
          const path: string[] = [to];
          let node = to;
          while (node !== from) {
            node = parent.get(node)!;
            path.unshift(node);
          }
          return path;
        }
        queue.push(next);
      }
    }
    return null;
  }

  /** All paths between two nodes (DFS with backtracking). Limited to maxPaths to prevent explosion. */
  allPaths(from: string, to: string, maxPaths = 100): string[][] {
    const results: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]) => {
      if (results.length >= maxPaths) return;
      if (current === to) {
        results.push([...path]);
        return;
      }
      visited.add(current);
      for (const next of this.successors(current)) {
        if (!visited.has(next)) {
          path.push(next);
          dfs(next, path);
          path.pop();
        }
      }
      visited.delete(current);
    };

    dfs(from, [from]);
    return results;
  }

  /** Topological sort using Kahn's algorithm. Throws if cycle detected. */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    for (const id of this._nodes.keys()) {
      inDegree.set(id, 0);
    }
    for (const targets of this._outEdges.values()) {
      for (const target of targets.keys()) {
        inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const target of this.successors(node)) {
        const newDegree = (inDegree.get(target) ?? 0) - 1;
        inDegree.set(target, newDegree);
        if (newDegree === 0) queue.push(target);
      }
    }

    if (result.length !== this._nodes.size) {
      throw new Error('Graph contains a cycle');
    }
    return result;
  }

  /** Check if graph has any cycles */
  hasCycle(): boolean {
    try {
      this.topologicalSort();
      return false;
    } catch {
      return true;
    }
  }

  /** Extract an induced subgraph containing only the given nodes and edges between them */
  subgraph(nodeIds: Set<string>): DirectedGraph<N, E> {
    const sub = new DirectedGraph<N, E>();
    for (const id of nodeIds) {
      const data = this._nodes.get(id);
      if (data !== undefined) {
        sub.addNode(id, data);
      }
    }
    for (const id of nodeIds) {
      const targets = this._outEdges.get(id);
      if (targets) {
        for (const [target, edgeData] of targets) {
          if (nodeIds.has(target)) {
            sub.addEdge(id, target, edgeData);
          }
        }
      }
    }
    return sub;
  }

  /** Serialize to plain JSON */
  toJSON(): SerializedGraph<N, E> {
    const nodes: Array<{ id: string; data: N }> = [];
    for (const [id, data] of this._nodes) {
      nodes.push({ id, data });
    }
    const edges: Array<{ source: string; target: string; data: E }> = [];
    for (const [source, targets] of this._outEdges) {
      for (const [target, data] of targets) {
        edges.push({ source, target, data });
      }
    }
    return { nodes, edges };
  }

  /** Deserialize from JSON */
  static fromJSON<N, E>(data: SerializedGraph<N, E>): DirectedGraph<N, E> {
    const g = new DirectedGraph<N, E>();
    for (const node of data.nodes) {
      g.addNode(node.id, node.data);
    }
    for (const edge of data.edges) {
      g.addEdge(edge.source, edge.target, edge.data);
    }
    return g;
  }

  private _bfs(
    startId: string,
    direction: 'successors' | 'predecessors',
    maxDepth?: number,
  ): string[] {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    visited.add(startId);
    const result: string[] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (maxDepth !== undefined && depth >= maxDepth) continue;

      const neighbors = direction === 'successors' ? this.successors(id) : this.predecessors(id);
      for (const next of neighbors) {
        if (!visited.has(next)) {
          visited.add(next);
          result.push(next);
          queue.push({ id: next, depth: depth + 1 });
        }
      }
    }
    return result;
  }
}
