/**
 * Message protocol between extension host and webview panels.
 * Shared types — imported by both sides.
 */

// --- Extension → Webview ---

export interface SetGraphMessage {
  type: 'setGraph';
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  projectName: string;
}

export interface HighlightNodeMessage {
  type: 'highlightNode';
  nodeId: string;
}

export interface SetFilterMessage {
  type: 'setFilter';
  filter: GraphFilter;
}

export type ExtensionToWebviewMessage =
  | SetGraphMessage
  | HighlightNodeMessage
  | SetFilterMessage;

// --- Webview → Extension ---

export interface NodeClickedMessage {
  type: 'nodeClicked';
  nodeId: string;
}

export interface NodeDoubleClickedMessage {
  type: 'nodeDoubleClicked';
  nodeId: string;
  filePath?: string;
}

export interface RequestAncestorsMessage {
  type: 'requestAncestors';
  nodeId: string;
  depth: number;
}

export interface RequestDescendantsMessage {
  type: 'requestDescendants';
  nodeId: string;
  depth: number;
}

export interface RequestPathMessage {
  type: 'requestPath';
  fromId: string;
  toId: string;
}

export interface ReadyMessage {
  type: 'ready';
}

export type WebviewToExtensionMessage =
  | NodeClickedMessage
  | NodeDoubleClickedMessage
  | RequestAncestorsMessage
  | RequestDescendantsMessage
  | RequestPathMessage
  | ReadyMessage;

// --- Shared Data Types ---

export interface GraphNodeData {
  id: string;
  name: string;
  type: 'model' | 'source' | 'seed' | 'snapshot' | 'test' | 'exposure';
  folder: string;
  filePath?: string;
  description?: string;
}

export interface GraphEdgeData {
  from: string;
  to: string;
}

export interface GraphFilter {
  folder?: string;
  type?: string;
  search?: string;
}
