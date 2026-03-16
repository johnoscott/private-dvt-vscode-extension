import * as vscode from 'vscode';
import type { DvtManifest } from '../core/dbt/manifest.js';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  GraphNodeData,
  GraphEdgeData,
} from '../webview/protocol.js';

/**
 * Shared logic for building lineage webview HTML and converting manifest to graph data.
 */
function manifestToGraphData(manifest: DvtManifest): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } {
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];

  for (const node of Object.values(manifest.nodes)) {
    nodes.push({
      id: node.id,
      name: node.name,
      type: 'model',
      folder: node.folder,
      filePath: node.filePath,
      description: node.description,
    });
  }

  for (const source of Object.values(manifest.sources)) {
    nodes.push({
      id: source.id,
      name: `${source.sourceName}.${source.tableName}`,
      type: 'source',
      folder: '',
      description: source.description,
    });
  }

  for (const edge of manifest.edges) {
    edges.push({ from: edge.from, to: edge.to });
  }

  return { nodes, edges };
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'lineage.js'),
  );
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1E1E1E;
      color: #CCC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: #252526;
      border-bottom: 1px solid #333;
      flex-shrink: 0;
    }
    #search-input {
      background: #3C3C3C;
      border: 1px solid #555;
      color: #CCC;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      width: 200px;
      outline: none;
    }
    #search-input:focus { border-color: #007ACC; }
    #search-input::placeholder { color: #888; }
    button {
      background: #3C3C3C;
      border: 1px solid #555;
      color: #CCC;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 12px;
      cursor: pointer;
    }
    button:hover { background: #4C4C4C; }
    button.active {
      background: #264F78;
      border-color: #007ACC;
      color: #FFF;
    }
    .separator {
      width: 1px;
      height: 18px;
      background: #555;
      flex-shrink: 0;
    }
    .toolbar-label {
      font-size: 11px;
      color: #999;
      white-space: nowrap;
    }
    .toolbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #canvas-container { flex: 1; position: relative; }
    #graph-canvas {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      cursor: grab;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <input type="text" id="search-input" placeholder="Search models..." />
    <button id="fit-btn">Fit</button>
    <div class="toolbar-right">
      <button id="dim-btn" class="active" title="Dim disconnected models">Dim</button>
      <button id="follow-btn" class="active" title="Follow active editor">Follow</button>
    </div>
  </div>
  <div id="canvas-container">
    <canvas id="graph-canvas"></canvas>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function handleWebviewMessage(
  msg: WebviewToExtensionMessage,
  manifest: DvtManifest,
  outputChannel: vscode.OutputChannel,
  sendGraph: () => void,
) {
  switch (msg.type) {
    case 'ready':
      sendGraph();
      break;
    case 'nodeClicked':
      outputChannel.appendLine(`Selected: ${msg.nodeId}`);
      break;
    case 'nodeDoubleClicked':
      if (msg.filePath) {
        vscode.workspace.openTextDocument(msg.filePath).then((doc) => {
          vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One,
            preview: true,
          });
        });
      }
      break;
  }
}

// --- Full editor panel (Cmd+Shift+P → DVT: Show Lineage Graph) ---

export class LineagePanel {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];
  private currentManifest: DvtManifest | undefined;

  constructor(
    private extensionUri: vscode.Uri,
    private outputChannel: vscode.OutputChannel,
  ) {}

  show(manifest: DvtManifest, projectRoot: string) {
    this.currentManifest = manifest;

    if (this.panel) {
      this.panel.reveal();
      this.sendGraph();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'dvt.lineageGraph',
      `Lineage: ${manifest.project.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
      },
    );

    this.panel.webview.html = getWebviewHtml(this.panel.webview, this.extensionUri);

    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) =>
        handleWebviewMessage(msg, manifest, this.outputChannel, () => this.sendGraph()),
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      for (const d of this.disposables) d.dispose();
      this.disposables = [];
    });
  }

  update(manifest: DvtManifest) {
    this.currentManifest = manifest;
    if (this.panel) {
      this.panel.title = `Lineage: ${manifest.project.name}`;
      this.sendGraph();
    }
  }

  highlightNode(nodeId: string) {
    this.panel?.webview.postMessage({ type: 'highlightNode', nodeId } as ExtensionToWebviewMessage);
  }

  private sendGraph() {
    if (!this.currentManifest) return;
    const { nodes, edges } = manifestToGraphData(this.currentManifest);
    this.panel?.webview.postMessage({
      type: 'setGraph', nodes, edges, projectName: this.currentManifest.project.name,
    } as ExtensionToWebviewMessage);
  }
}

// --- Bottom panel view (always visible, follows active editor) ---

export class LineageViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'dvt.lineageView';

  private view: vscode.WebviewView | undefined;
  private currentManifest: DvtManifest | undefined;
  private currentNodeId: string | undefined;
  private ready = false;

  constructor(
    private extensionUri: vscode.Uri,
    private outputChannel: vscode.OutputChannel,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.view = webviewView;
    this.ready = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri);

    webviewView.webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
      if (msg.type === 'ready') {
        this.ready = true;
        this.refresh();
        return;
      }
      if (this.currentManifest) {
        handleWebviewMessage(msg, this.currentManifest, this.outputChannel, () => this.refresh());
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this.ready) {
        this.refresh();
      }
    });
  }

  /** Update the manifest and optionally highlight a node */
  setContext(manifest: DvtManifest, nodeId?: string) {
    this.currentManifest = manifest;
    this.currentNodeId = nodeId;
    if (this.ready) {
      this.refresh();
    }
  }

  /** Highlight a specific node (center + select) */
  highlightNode(nodeId: string) {
    this.currentNodeId = nodeId;
    if (this.ready && this.view?.visible) {
      this.view.webview.postMessage({ type: 'highlightNode', nodeId } as ExtensionToWebviewMessage);
    }
  }

  private refresh() {
    if (!this.view || !this.currentManifest) return;
    const { nodes, edges } = manifestToGraphData(this.currentManifest);
    this.view.webview.postMessage({
      type: 'setGraph', nodes, edges, projectName: this.currentManifest.project.name,
    } as ExtensionToWebviewMessage);

    // After a short delay (let layout complete), highlight the current node
    if (this.currentNodeId) {
      const nodeId = this.currentNodeId;
      setTimeout(() => {
        this.view?.webview.postMessage({ type: 'highlightNode', nodeId } as ExtensionToWebviewMessage);
      }, 100);
    }
  }
}
