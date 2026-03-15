export interface LineageNode {
  id: string;
  name: string;
  type: 'model' | 'source' | 'seed' | 'snapshot' | 'test' | 'exposure' | 'table' | 'view';
  provider: string;
  filePath?: string;
  description?: string;
  tags?: string[];
  materialization?: string;
}

export interface LineageEdge {
  type: 'ref' | 'source' | 'sql';
}

export interface LineageProvider {
  readonly id: string;
  readonly name: string;

  /** Discover all nodes this provider knows about */
  discover(): LineageNode[];

  /** Get the IDs of nodes that `nodeId` depends on */
  dependencies(nodeId: string): string[];
}
