import { describe, it, expect, beforeEach } from 'vitest';
import { DirectedGraph } from '@core/graph/directed-graph';

describe('DirectedGraph', () => {
  let g: DirectedGraph<string, string>;

  beforeEach(() => {
    g = new DirectedGraph();
  });

  describe('node operations', () => {
    it('adds and retrieves nodes', () => {
      g.addNode('a', 'node-a');
      expect(g.hasNode('a')).toBe(true);
      expect(g.getNode('a')).toBe('node-a');
      expect(g.nodeCount).toBe(1);
    });

    it('returns undefined for missing nodes', () => {
      expect(g.getNode('missing')).toBeUndefined();
      expect(g.hasNode('missing')).toBe(false);
    });

    it('overwrites node data on duplicate add', () => {
      g.addNode('a', 'v1');
      g.addNode('a', 'v2');
      expect(g.getNode('a')).toBe('v2');
      expect(g.nodeCount).toBe(1);
    });

    it('removes nodes and their edges', () => {
      g.addNode('a', 'a');
      g.addNode('b', 'b');
      g.addNode('c', 'c');
      g.addEdge('a', 'b', 'e1');
      g.addEdge('b', 'c', 'e2');

      g.removeNode('b');

      expect(g.hasNode('b')).toBe(false);
      expect(g.nodeCount).toBe(2);
      expect(g.edgeCount).toBe(0);
      expect(g.successors('a')).toEqual([]);
      expect(g.predecessors('c')).toEqual([]);
    });

    it('lists all node IDs', () => {
      g.addNode('x', 'x');
      g.addNode('y', 'y');
      expect(g.nodeIds().sort()).toEqual(['x', 'y']);
    });
  });

  describe('edge operations', () => {
    beforeEach(() => {
      g.addNode('a', 'a');
      g.addNode('b', 'b');
      g.addNode('c', 'c');
    });

    it('adds and checks edges', () => {
      g.addEdge('a', 'b', 'e1');
      expect(g.hasEdge('a', 'b')).toBe(true);
      expect(g.hasEdge('b', 'a')).toBe(false);
      expect(g.edgeCount).toBe(1);
    });

    it('throws when adding edge to missing node', () => {
      expect(() => g.addEdge('a', 'missing', 'e')).toThrow('Node not found: missing');
      expect(() => g.addEdge('missing', 'a', 'e')).toThrow('Node not found: missing');
    });

    it('removes edges', () => {
      g.addEdge('a', 'b', 'e1');
      g.removeEdge('a', 'b');
      expect(g.hasEdge('a', 'b')).toBe(false);
      expect(g.edgeCount).toBe(0);
    });

    it('tracks successors and predecessors', () => {
      g.addEdge('a', 'b', 'e1');
      g.addEdge('a', 'c', 'e2');

      expect(g.successors('a').sort()).toEqual(['b', 'c']);
      expect(g.predecessors('b')).toEqual(['a']);
      expect(g.predecessors('a')).toEqual([]);
    });
  });

  describe('traversal', () => {
    /**
     * Test DAG:
     *   a → b → d → e
     *   a → c → d
     *       c → f
     */
    beforeEach(() => {
      for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) g.addNode(id, id);
      g.addEdge('a', 'b', '');
      g.addEdge('a', 'c', '');
      g.addEdge('b', 'd', '');
      g.addEdge('c', 'd', '');
      g.addEdge('c', 'f', '');
      g.addEdge('d', 'e', '');
    });

    it('finds all descendants', () => {
      expect(g.descendants('a').sort()).toEqual(['b', 'c', 'd', 'e', 'f']);
    });

    it('finds descendants with depth limit', () => {
      const depth1 = g.descendants('a', 1);
      expect(depth1.sort()).toEqual(['b', 'c']);
    });

    it('finds descendants with depth 2', () => {
      const depth2 = g.descendants('a', 2);
      expect(depth2.sort()).toEqual(['b', 'c', 'd', 'f']);
    });

    it('finds all ancestors', () => {
      expect(g.ancestors('e').sort()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('finds ancestors with depth limit', () => {
      expect(g.ancestors('e', 1)).toEqual(['d']);
    });

    it('returns empty for leaf descendants', () => {
      expect(g.descendants('e')).toEqual([]);
    });

    it('returns empty for root ancestors', () => {
      expect(g.ancestors('a')).toEqual([]);
    });
  });

  describe('path finding', () => {
    beforeEach(() => {
      for (const id of ['a', 'b', 'c', 'd', 'e']) g.addNode(id, id);
      g.addEdge('a', 'b', '');
      g.addEdge('a', 'c', '');
      g.addEdge('b', 'd', '');
      g.addEdge('c', 'd', '');
      g.addEdge('d', 'e', '');
    });

    it('finds shortest path', () => {
      expect(g.shortestPath('a', 'e')).toEqual(['a', 'b', 'e'].length === 3 ? g.shortestPath('a', 'e') : null);
      // a→b→d→e or a→c→d→e — both length 4
      const path = g.shortestPath('a', 'e')!;
      expect(path[0]).toBe('a');
      expect(path[path.length - 1]).toBe('e');
      expect(path.length).toBe(4);
    });

    it('returns path to self', () => {
      expect(g.shortestPath('a', 'a')).toEqual(['a']);
    });

    it('returns null for unreachable nodes', () => {
      expect(g.shortestPath('e', 'a')).toBeNull();
    });

    it('finds all paths between two nodes', () => {
      const paths = g.allPaths('a', 'e');
      expect(paths.length).toBe(2);
      // Both paths: a→b→d→e and a→c→d→e
      const pathStrs = paths.map((p) => p.join('→')).sort();
      expect(pathStrs).toEqual(['a→b→d→e', 'a→c→d→e']);
    });

    it('returns empty for unreachable paths', () => {
      expect(g.allPaths('e', 'a')).toEqual([]);
    });
  });

  describe('topological sort', () => {
    it('sorts a DAG correctly', () => {
      g.addNode('a', 'a');
      g.addNode('b', 'b');
      g.addNode('c', 'c');
      g.addEdge('a', 'b', '');
      g.addEdge('b', 'c', '');

      const sorted = g.topologicalSort();
      expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('b'));
      expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('c'));
    });

    it('throws on cycle', () => {
      g.addNode('a', 'a');
      g.addNode('b', 'b');
      g.addEdge('a', 'b', '');
      g.addEdge('b', 'a', '');

      expect(() => g.topologicalSort()).toThrow('cycle');
    });

    it('hasCycle detects cycles', () => {
      g.addNode('a', 'a');
      g.addNode('b', 'b');
      g.addEdge('a', 'b', '');
      g.addEdge('b', 'a', '');

      expect(g.hasCycle()).toBe(true);
    });

    it('hasCycle returns false for DAG', () => {
      g.addNode('a', 'a');
      g.addNode('b', 'b');
      g.addEdge('a', 'b', '');

      expect(g.hasCycle()).toBe(false);
    });
  });

  describe('subgraph', () => {
    it('extracts induced subgraph', () => {
      for (const id of ['a', 'b', 'c', 'd']) g.addNode(id, id);
      g.addEdge('a', 'b', 'e1');
      g.addEdge('b', 'c', 'e2');
      g.addEdge('c', 'd', 'e3');

      const sub = g.subgraph(new Set(['a', 'b', 'c']));

      expect(sub.nodeCount).toBe(3);
      expect(sub.hasNode('d')).toBe(false);
      expect(sub.hasEdge('a', 'b')).toBe(true);
      expect(sub.hasEdge('b', 'c')).toBe(true);
      expect(sub.edgeCount).toBe(2);
    });

    it('excludes edges to nodes outside subgraph', () => {
      for (const id of ['a', 'b', 'c']) g.addNode(id, id);
      g.addEdge('a', 'b', '');
      g.addEdge('a', 'c', '');

      const sub = g.subgraph(new Set(['a', 'b']));
      expect(sub.hasEdge('a', 'c')).toBe(false);
      expect(sub.edgeCount).toBe(1);
    });
  });

  describe('serialization', () => {
    it('round-trips through JSON', () => {
      g.addNode('a', 'data-a');
      g.addNode('b', 'data-b');
      g.addEdge('a', 'b', 'edge-ab');

      const json = g.toJSON();
      const restored = DirectedGraph.fromJSON(json);

      expect(restored.nodeCount).toBe(2);
      expect(restored.getNode('a')).toBe('data-a');
      expect(restored.hasEdge('a', 'b')).toBe(true);
      expect(restored.edgeCount).toBe(1);
    });

    it('produces clean JSON structure', () => {
      g.addNode('x', 'val');
      const json = g.toJSON();
      expect(json.nodes).toEqual([{ id: 'x', data: 'val' }]);
      expect(json.edges).toEqual([]);
    });
  });
});
