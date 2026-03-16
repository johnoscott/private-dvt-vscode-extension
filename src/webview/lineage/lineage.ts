/**
 * Lineage graph webview — Canvas2D renderer with layered layout.
 * Runs inside a VS Code webview panel.
 */

import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  GraphNodeData,
  GraphEdgeData,
} from '../protocol.js';

// @ts-ignore — injected by VS Code webview
const vscode = acquireVsCodeApi();

// --- Constants ---

const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;
const NODE_RADIUS = 6;
const FONT_SIZE = 12;
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const EDGE_ARROW_SIZE = 6;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  model: { bg: '#2D4A7A', border: '#4A90D9', text: '#E8F0FE' },
  source: { bg: '#2A5A3A', border: '#48BB78', text: '#E6F7ED' },
  seed: { bg: '#5A4A2A', border: '#ED8936', text: '#FEF3E2' },
  snapshot: { bg: '#3A3A6A', border: '#667EEA', text: '#E8E8FE' },
  test: { bg: '#5A3A2A', border: '#ED8936', text: '#FEF3E2' },
  exposure: { bg: '#4A2A4A', border: '#9F7AEA', text: '#F3E8FE' },
};

const DEFAULT_COLOR = { bg: '#3A3A3A', border: '#888', text: '#EEE' };

// --- State ---

interface LayoutNode {
  id: string;
  data: GraphNodeData;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutEdge {
  from: string;
  to: string;
  points: Array<{ x: number; y: number }>;
}

let nodes: LayoutNode[] = [];
let edges: LayoutEdge[] = [];
let projectName = '';

// Full graph data (stored for re-layout in Focus mode)
let fullNodes: LayoutNode[] = [];
let fullEdges: LayoutEdge[] = [];
let rawNodeData: GraphNodeData[] = [];
let rawEdgeData: GraphEdgeData[] = [];

// Graph adjacency (for connected highlighting)
let graphChildren = new Map<string, Set<string>>();
let graphParents = new Map<string, Set<string>>();

// Viewport
let panX = 0;
let panY = 0;
let zoom = 1;

// Interaction
let hoveredNode: LayoutNode | null = null;
let selectedNode: LayoutNode | null = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;

// Connected nodes (upstream + downstream of selected)
let connectedNodes: Set<string> = new Set();
let connectedEdges: Set<string> = new Set(); // "from→to"
let upstreamNodes: Set<string> = new Set();
let downstreamNodes: Set<string> = new Set();

// Search
let searchQuery = '';
let searchMatches: Set<string> = new Set();

// Controls
type DisconnectedMode = 'show' | 'dim' | 'hide';
let disconnectedMode: DisconnectedMode = 'dim';
let followMode = true;

// Canvas
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let dpr: number;

// --- Init ---

function init() {
  canvas = document.getElementById('graph-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  dpr = window.devicePixelRatio || 1;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse events
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDoubleClick);

  // Search
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    if (searchQuery) {
      searchMatches = new Set(
        nodes.filter((n) => n.data.name.toLowerCase().includes(searchQuery)).map((n) => n.id),
      );
      const firstMatch = nodes.find((n) => searchMatches.has(n.id));
      if (firstMatch) centerOnNode(firstMatch);
    } else {
      searchMatches = new Set();
    }
    draw();
  });

  // Fit button
  document.getElementById('fit-btn')?.addEventListener('click', fitToView);

  // Disconnected mode: show → dim → hide → show
  const dimBtn = document.getElementById('dim-btn') as HTMLButtonElement;
  dimBtn?.addEventListener('click', () => {
    const cycle: DisconnectedMode[] = ['show', 'dim', 'hide'];
    const idx = cycle.indexOf(disconnectedMode);
    disconnectedMode = cycle[(idx + 1) % cycle.length];
    updateDimButton(dimBtn);
    applyViewMode();
  });
  updateDimButton(dimBtn);

  // Follow mode toggle
  const followBtn = document.getElementById('follow-btn') as HTMLButtonElement;
  followBtn?.addEventListener('click', () => {
    followMode = !followMode;
    followBtn.classList.toggle('active', followMode);
  });

  // Listen for messages from extension
  window.addEventListener('message', (event) => {
    const msg = event.data as ExtensionToWebviewMessage;
    handleMessage(msg);
  });

  // Tell extension we're ready
  postMessage({ type: 'ready' });
}

function resizeCanvas() {
  const rect = canvas.parentElement!.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

// --- Message Handling ---

function handleMessage(msg: ExtensionToWebviewMessage) {
  switch (msg.type) {
    case 'setGraph':
      projectName = msg.projectName;
      layoutGraph(msg.nodes, msg.edges);
      fitToView();
      break;
    case 'highlightNode': {
      // Find in full nodes (Focus mode may have a filtered set)
      const fullNode = fullNodes.find((n) => n.id === msg.nodeId);
      if (fullNode) {
        selectNode(fullNode);
        // After selectNode, nodes/edges may have been re-laid-out in Focus mode
        // Find the node in current layout for centering
        const currentNode = nodes.find((n) => n.id === msg.nodeId);
        if (followMode && currentNode) {
          if (zoom < 0.5) zoom = 0.8;
          if (zoom > 2) zoom = 1;
          centerOnNode(currentNode);
        }
        draw();
      }
      break;
    }
  }
}

function postMessage(msg: WebviewToExtensionMessage) {
  vscode.postMessage(msg);
}

// --- Graph Adjacency ---

function buildAdjacency(edgeData: GraphEdgeData[]) {
  graphChildren = new Map();
  graphParents = new Map();

  for (const n of nodes) {
    graphChildren.set(n.id, new Set());
    graphParents.set(n.id, new Set());
  }

  for (const e of edgeData) {
    graphChildren.get(e.from)?.add(e.to);
    graphParents.get(e.to)?.add(e.from);
  }
}

/** BFS to find all upstream (ancestors) of a node */
function findUpstream(nodeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const parent of graphParents.get(current) || []) {
      if (!result.has(parent)) {
        result.add(parent);
        queue.push(parent);
      }
    }
  }
  return result;
}

/** BFS to find all downstream (descendants) of a node */
function findDownstream(nodeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of graphChildren.get(current) || []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

/** Update the connected sets when a node is selected */
function selectNode(node: LayoutNode | null) {
  selectedNode = node;

  if (node) {
    upstreamNodes = findUpstream(node.id);
    downstreamNodes = findDownstream(node.id);
    connectedNodes = new Set([node.id, ...upstreamNodes, ...downstreamNodes]);

    // Build connected edges set (from full edges, not current view)
    connectedEdges = new Set();
    for (const edge of fullEdges) {
      if (connectedNodes.has(edge.from) && connectedNodes.has(edge.to)) {
        connectedEdges.add(`${edge.from}→${edge.to}`);
      }
    }
  } else {
    upstreamNodes = new Set();
    downstreamNodes = new Set();
    connectedNodes = new Set();
    connectedEdges = new Set();
  }

  // In Focus mode, re-layout the subgraph
  if (disconnectedMode === 'hide') {
    applyFocusLayout();
  }
}

/** Switch between full / dim / focus layout */
function applyViewMode() {
  if (disconnectedMode === 'hide' && selectedNode) {
    applyFocusLayout();
  } else {
    // Restore full layout
    nodes = [...fullNodes];
    edges = [...fullEdges];
    if (selectedNode) {
      selectedNode = nodes.find((n) => n.id === selectedNode!.id) || null;
    }
    fitToView();
  }
  draw();
}

/** Re-layout only the connected subgraph */
function applyFocusLayout() {
  if (!selectedNode || connectedNodes.size === 0) {
    nodes = [...fullNodes];
    edges = [...fullEdges];
    draw();
    return;
  }

  // Filter to connected nodes/edges and re-layout
  const subNodeData = rawNodeData.filter((n) => connectedNodes.has(n.id));
  const subEdgeData = rawEdgeData.filter(
    (e) => connectedNodes.has(e.from) && connectedNodes.has(e.to),
  );

  // Run layout on the subgraph (reuses the layout algorithm)
  const prevSelected = selectedNode.id;
  layoutSubgraph(subNodeData, subEdgeData);

  // Restore selection on the new layout
  const newSelected = nodes.find((n) => n.id === prevSelected);
  // Don't recurse — set directly
  selectedNode = newSelected || null;

  fitToView();
  if (newSelected && followMode) {
    centerOnNode(newSelected);
  }
  draw();
}

/** Layout a subset of nodes (same algorithm as layoutGraph but doesn't touch full* or adjacency) */
function layoutSubgraph(nodeData: GraphNodeData[], edgeData: GraphEdgeData[]) {
  const nodeMap = new Map<string, GraphNodeData>();
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodeData) {
    nodeMap.set(n.id, n);
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edgeData) {
    if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
      children.get(e.from)!.push(e.to);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }
  }

  const layers: string[][] = [];
  const nodeLayer = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const current = [...queue];
    queue.length = 0;
    layers.push(current);
    for (const id of current) {
      nodeLayer.set(id, layers.length - 1);
      for (const child of children.get(id) || []) {
        const newDeg = (inDegree.get(child) || 0) - 1;
        inDegree.set(child, newDeg);
        if (newDeg === 0) queue.push(child);
      }
    }
  }

  for (const n of nodeData) {
    if (!nodeLayer.has(n.id)) {
      layers.push([n.id]);
      nodeLayer.set(n.id, layers.length - 1);
    }
  }

  const LAYER_GAP = 100;
  const NODE_GAP = 20;

  nodes = [];
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const totalHeight = layer.length * NODE_HEIGHT + (layer.length - 1) * NODE_GAP;
    const startY = -totalHeight / 2;
    for (let i = 0; i < layer.length; i++) {
      const id = layer[i];
      nodes.push({
        id, data: nodeMap.get(id)!,
        x: li * (NODE_WIDTH + LAYER_GAP),
        y: startY + i * (NODE_HEIGHT + NODE_GAP),
        width: NODE_WIDTH, height: NODE_HEIGHT,
      });
    }
  }

  const nodeById = new Map<string, LayoutNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  edges = [];
  for (const e of edgeData) {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (from && to) {
      edges.push({
        from: e.from, to: e.to,
        points: [
          { x: from.x + from.width, y: from.y + from.height / 2 },
          { x: to.x, y: to.y + to.height / 2 },
        ],
      });
    }
  }
}

// --- Layout ---

function layoutGraph(nodeData: GraphNodeData[], edgeData: GraphEdgeData[]) {
  // Store raw data for re-layout in Focus mode
  rawNodeData = nodeData;
  rawEdgeData = edgeData;

  const nodeMap = new Map<string, GraphNodeData>();
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodeData) {
    nodeMap.set(n.id, n);
    children.set(n.id, []);
    parents.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edgeData) {
    if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
      children.get(e.from)!.push(e.to);
      parents.get(e.to)!.push(e.from);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }
  }

  // Topological sort → assign layers
  const layers: string[][] = [];
  const nodeLayer = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const current: string[] = [...queue];
    queue.length = 0;
    layers.push(current);
    const layerIdx = layers.length - 1;

    for (const id of current) {
      nodeLayer.set(id, layerIdx);
      for (const child of children.get(id) || []) {
        const newDeg = (inDegree.get(child) || 0) - 1;
        inDegree.set(child, newDeg);
        if (newDeg === 0) queue.push(child);
      }
    }
  }

  // Handle remaining nodes (cycles or disconnected)
  for (const n of nodeData) {
    if (!nodeLayer.has(n.id)) {
      layers.push([n.id]);
      nodeLayer.set(n.id, layers.length - 1);
    }
  }

  // Position nodes
  const LAYER_GAP = 100;
  const NODE_GAP = 20;

  nodes = [];
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const totalHeight = layer.length * NODE_HEIGHT + (layer.length - 1) * NODE_GAP;
    const startY = -totalHeight / 2;

    for (let i = 0; i < layer.length; i++) {
      const id = layer[i];
      const data = nodeMap.get(id)!;
      nodes.push({
        id, data,
        x: layerIdx * (NODE_WIDTH + LAYER_GAP),
        y: startY + i * (NODE_HEIGHT + NODE_GAP),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  }

  // Build edge point lists
  const nodeById = new Map<string, LayoutNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  edges = [];
  for (const e of edgeData) {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (from && to) {
      edges.push({
        from: e.from,
        to: e.to,
        points: [
          { x: from.x + from.width, y: from.y + from.height / 2 },
          { x: to.x, y: to.y + to.height / 2 },
        ],
      });
    }
  }

  // Store full layout
  fullNodes = [...nodes];
  fullEdges = [...edges];

  // Build adjacency for connected highlighting (always from full graph)
  buildAdjacency(edgeData);

  // Re-select if we had a selection (graph was rebuilt)
  if (selectedNode) {
    const refreshed = nodes.find((n) => n.id === selectedNode!.id);
    selectNode(refreshed || null);
    if (disconnectedMode === 'hide') {
      applyFocusLayout();
      return;
    }
  }
}

// --- Drawing ---

function draw() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.fillStyle = '#1E1E1E';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Draw edges (dimmed first, then highlighted on top)
  for (const edge of edges) {
    if (!isEdgeHighlighted(edge)) drawEdge(edge);
  }
  for (const edge of edges) {
    if (isEdgeHighlighted(edge)) drawEdge(edge);
  }

  // Draw nodes (dimmed first, then highlighted on top)
  for (const node of nodes) {
    if (!isNodeHighlighted(node)) drawNode(node);
  }
  for (const node of nodes) {
    if (isNodeHighlighted(node)) drawNode(node);
  }

  ctx.restore();
  drawHUD(w, h);
}

function isNodeHighlighted(node: LayoutNode): boolean {
  if (searchMatches.size > 0) return searchMatches.has(node.id);
  if (selectedNode && connectedNodes.size > 0) return connectedNodes.has(node.id);
  return true;
}

function isEdgeHighlighted(edge: LayoutEdge): boolean {
  if (searchMatches.size > 0) return searchMatches.has(edge.from) && searchMatches.has(edge.to);
  if (selectedNode && connectedEdges.size > 0) return connectedEdges.has(`${edge.from}→${edge.to}`);
  return true;
}

function isDisconnectedNode(node: LayoutNode): boolean {
  if (searchMatches.size > 0) return !searchMatches.has(node.id);
  if (selectedNode && connectedNodes.size > 0) return !connectedNodes.has(node.id);
  return false;
}

function isDisconnectedEdge(edge: LayoutEdge): boolean {
  if (searchMatches.size > 0) return !searchMatches.has(edge.from) || !searchMatches.has(edge.to);
  if (selectedNode && connectedEdges.size > 0) return !connectedEdges.has(`${edge.from}→${edge.to}`);
  return false;
}

function shouldDim(node: LayoutNode): boolean {
  return disconnectedMode === 'dim' && isDisconnectedNode(node);
}

function shouldDimEdge(edge: LayoutEdge): boolean {
  return disconnectedMode === 'dim' && isDisconnectedEdge(edge);
}

function updateDimButton(btn: HTMLButtonElement) {
  const labels: Record<DisconnectedMode, string> = {
    show: 'All',
    dim: 'Dim',
    hide: 'Focus',
  };
  const titles: Record<DisconnectedMode, string> = {
    show: 'Showing all nodes',
    dim: 'Dimming disconnected nodes',
    hide: 'Hiding disconnected nodes',
  };
  btn.textContent = labels[disconnectedMode];
  btn.title = titles[disconnectedMode];
  btn.classList.toggle('active', disconnectedMode !== 'show');
}

function drawNode(node: LayoutNode) {
  const colors = TYPE_COLORS[node.data.type] || DEFAULT_COLOR;
  const isHovered = hoveredNode?.id === node.id;
  const isSelected = selectedNode?.id === node.id;
  const isUpstream = upstreamNodes.has(node.id);
  const isDownstream = downstreamNodes.has(node.id);
  const isSearchMatch = searchMatches.size > 0 && searchMatches.has(node.id);
  const dimmed = shouldDim(node);

  ctx.save();

  if (dimmed) {
    ctx.globalAlpha = 0.15;
  }

  // Shadow for selected
  if (isSelected) {
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 16;
  }

  // Background
  ctx.fillStyle = isHovered ? lighten(colors.bg, 0.15) : colors.bg;
  roundRect(ctx, node.x, node.y, node.width, node.height, NODE_RADIUS);
  ctx.fill();

  // Border
  let borderColor = colors.border;
  let borderWidth = 1;
  if (isSelected) {
    borderColor = '#FFFFFF';
    borderWidth = 2.5;
  } else if (isSearchMatch) {
    borderColor = '#FFD700';
    borderWidth = 2;
  } else if (isUpstream && !dimmed) {
    borderColor = '#FF9F43'; // orange for upstream
    borderWidth = 1.5;
  } else if (isDownstream && !dimmed) {
    borderColor = '#0ABDE3'; // cyan for downstream
    borderWidth = 1.5;
  }

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.shadowBlur = 0;
  roundRect(ctx, node.x, node.y, node.width, node.height, NODE_RADIUS);
  ctx.stroke();

  // Type badge
  const badgeW = 6;
  const badgeH = node.height - 8;
  ctx.fillStyle = colors.border;
  roundRect(ctx, node.x + 4, node.y + 4, badgeW, badgeH, 2);
  ctx.fill();

  // Label
  ctx.fillStyle = colors.text;
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  const maxTextW = node.width - 22;
  let label = node.data.name;
  while (ctx.measureText(label).width > maxTextW && label.length > 3) {
    label = label.slice(0, -4) + '\u2026';
  }
  ctx.fillText(label, node.x + 16, node.y + node.height / 2);

  ctx.restore();
}

function drawEdge(edge: LayoutEdge) {
  if (edge.points.length < 2) return;

  const dimmed = shouldDimEdge(edge);
  const highlighted = isEdgeHighlighted(edge) && selectedNode !== null;

  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.08;

  const start = edge.points[0];
  const end = edge.points[edge.points.length - 1];
  const midX = (start.x + end.x) / 2;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.bezierCurveTo(midX, start.y, midX, end.y, end.x, end.y);

  if (highlighted && !dimmed) {
    // Color edge based on direction relative to selected
    const isUpstreamEdge = upstreamNodes.has(edge.from) && (upstreamNodes.has(edge.to) || edge.to === selectedNode!.id);
    ctx.strokeStyle = isUpstreamEdge ? '#FF9F43' : '#0ABDE3';
    ctx.lineWidth = 1.5;
  } else {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
  }
  ctx.stroke();

  // Arrow head
  const angle = Math.atan2(end.y - start.y, end.x - midX);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - EDGE_ARROW_SIZE * Math.cos(angle - Math.PI / 6),
    end.y - EDGE_ARROW_SIZE * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - EDGE_ARROW_SIZE * Math.cos(angle + Math.PI / 6),
    end.y - EDGE_ARROW_SIZE * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = highlighted && !dimmed
    ? (upstreamNodes.has(edge.from) ? '#FF9F43' : '#0ABDE3')
    : '#555';
  ctx.fill();

  ctx.restore();
}

function drawHUD(w: number, h: number) {
  ctx.fillStyle = '#888';
  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    `${projectName} \u2014 ${nodes.length} nodes, ${edges.length} edges \u2014 ${Math.round(zoom * 100)}%`,
    8, h - 8,
  );

  if (selectedNode) {
    ctx.fillStyle = '#CCC';
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    ctx.fillText(selectedNode.data.name, 8, 8);

    ctx.fillStyle = '#888';
    ctx.font = `11px ${FONT_FAMILY}`;
    const info: string[] = [];
    if (selectedNode.data.folder) info.push(selectedNode.data.folder);
    info.push(`${selectedNode.data.type}`);
    if (upstreamNodes.size > 0) info.push(`\u2191${upstreamNodes.size} upstream`);
    if (downstreamNodes.size > 0) info.push(`\u2193${downstreamNodes.size} downstream`);
    ctx.fillText(info.join(' \u00b7 '), 8, 24);
  }
}

// --- Interaction ---

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
}

function nodeAt(wx: number, wy: number): LayoutNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
      return n;
    }
  }
  return null;
}

function onMouseDown(e: MouseEvent) {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  panStartX = panX;
  panStartY = panY;
}

function onMouseMove(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (isDragging) {
    panX = panStartX + (e.clientX - dragStartX);
    panY = panStartY + (e.clientY - dragStartY);
    draw();
    return;
  }

  const { x, y } = screenToWorld(sx, sy);
  const hit = nodeAt(x, y);
  if (hit !== hoveredNode) {
    hoveredNode = hit;
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    draw();
  }
}

function onMouseUp(e: MouseEvent) {
  const didDrag = Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3;
  isDragging = false;
  canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';

  if (!didDrag) {
    // It was a click, not a drag — select/deselect
    const rect = canvas.getBoundingClientRect();
    const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = nodeAt(x, y);
    if (hit) {
      selectNode(hit);
      postMessage({ type: 'nodeClicked', nodeId: hit.id });
    } else {
      selectNode(null);
    }
    draw();
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

  panX = sx - ((sx - panX) / zoom) * newZoom;
  panY = sy - ((sy - panY) / zoom) * newZoom;
  zoom = newZoom;
  draw();
}

function onDoubleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  const hit = nodeAt(x, y);
  if (hit) {
    postMessage({ type: 'nodeDoubleClicked', nodeId: hit.id, filePath: hit.data.filePath });
  }
}

// --- Navigation ---

function centerOnNode(node: LayoutNode) {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  panX = w / 2 - (node.x + node.width / 2) * zoom;
  panY = h / 2 - (node.y + node.height / 2) * zoom;
}

function fitToView() {
  if (nodes.length === 0) return;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }

  const graphW = maxX - minX;
  const graphH = maxY - minY;
  const padding = 40;

  zoom = Math.min((w - padding * 2) / graphW, (h - padding * 2) / graphH, 1.5);
  zoom = Math.max(MIN_ZOOM, zoom);

  panX = w / 2 - ((minX + maxX) / 2) * zoom;
  panY = h / 2 - ((minY + maxY) / 2) * zoom;
  draw();
}

// --- Utilities ---

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r, g, b].map((c) =>
    Math.min(255, Math.round(c + (255 - c) * amount)).toString(16).padStart(2, '0'),
  ).join('');
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', init);
