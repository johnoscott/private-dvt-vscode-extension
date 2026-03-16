import * as vscode from 'vscode';
import type { DvtManifest, DvtManifestNode, DvtManifestSource } from '../core/dbt/manifest.js';
import { manifestToGraph } from '../core/dbt/manifest.js';
import type { DbtColumn } from '../core/dbt/types.js';

/**
 * Instant Docs — a webview panel showing model/source documentation
 * built from YAML descriptions. No dbt manifest or dbt docs generate needed.
 */
export class DocsPanel {
  private panel: vscode.WebviewPanel | undefined;
  private currentManifest: DvtManifest | undefined;
  private currentNodeId: string | undefined;

  constructor(private outputChannel: vscode.OutputChannel) {}

  show(manifest: DvtManifest, nodeId?: string) {
    this.currentManifest = manifest;
    this.currentNodeId = nodeId;

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.updateContent();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'dvt.docs',
      'DVT Docs',
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );

    this.updateContent();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  update(manifest: DvtManifest, nodeId?: string) {
    this.currentManifest = manifest;
    if (nodeId) this.currentNodeId = nodeId;
    if (this.panel) this.updateContent();
  }

  setNode(manifest: DvtManifest, nodeId: string) {
    this.currentManifest = manifest;
    this.currentNodeId = nodeId;
    if (this.panel) {
      this.panel.title = `Docs: ${nodeId.split('.').pop()}`;
      this.updateContent();
    }
  }

  private updateContent() {
    if (!this.panel || !this.currentManifest) return;

    if (this.currentNodeId) {
      const node = this.currentManifest.nodes[this.currentNodeId];
      if (node) {
        this.panel.title = `Docs: ${node.name}`;
        this.panel.webview.html = this.renderModelDoc(node);
        return;
      }
      const source = this.currentManifest.sources[this.currentNodeId];
      if (source) {
        this.panel.title = `Docs: ${source.sourceName}.${source.tableName}`;
        this.panel.webview.html = this.renderSourceDoc(source);
        return;
      }
    }

    // No specific node — show index
    this.panel.title = `Docs: ${this.currentManifest.project.name}`;
    this.panel.webview.html = this.renderIndex();
  }

  private renderModelDoc(node: DvtManifestNode): string {
    const graph = manifestToGraph(this.currentManifest!);
    const upstream = graph.predecessors(node.id);
    const downstream = graph.successors(node.id);

    let html = `
      <h1>${node.name}</h1>
      <div class="meta">
        <span class="badge model">model</span>
        ${node.folder ? `<span class="badge folder">${node.folder}</span>` : ''}
        ${node.materialization ? `<span class="badge mat">${node.materialization}</span>` : ''}
        ${(node.tags || []).map((t) => `<span class="badge tag">${t}</span>`).join('')}
      </div>
      <p class="path">${node.relativePath}</p>
    `;

    if (node.description) {
      html += `<div class="description">${escapeHtml(node.description)}</div>`;
    }

    // Columns
    if (node.columns && node.columns.length > 0) {
      html += `<h2>Columns (${node.columns.length})</h2>`;
      html += this.renderColumnsTable(node.columns);
    }

    // Dependencies
    if (upstream.length > 0) {
      html += `<h2>Depends On (${upstream.length})</h2><ul>`;
      for (const id of upstream) html += `<li><code>${idToName(id)}</code></li>`;
      html += `</ul>`;
    }

    if (downstream.length > 0) {
      html += `<h2>Referenced By (${downstream.length})</h2><ul>`;
      for (const id of downstream) html += `<li><code>${idToName(id)}</code></li>`;
      html += `</ul>`;
    }

    return this.wrapHtml(html);
  }

  private renderSourceDoc(source: DvtManifestSource): string {
    const graph = manifestToGraph(this.currentManifest!);
    const downstream = graph.successors(source.id);

    let html = `
      <h1>${source.sourceName}.${source.tableName}</h1>
      <div class="meta">
        <span class="badge source">source</span>
        ${source.database ? `<span class="badge">${source.database}</span>` : ''}
        ${source.schema ? `<span class="badge">${source.schema}</span>` : ''}
      </div>
    `;

    if (source.description) {
      html += `<div class="description">${escapeHtml(source.description)}</div>`;
    }

    if (source.columns && source.columns.length > 0) {
      html += `<h2>Columns (${source.columns.length})</h2>`;
      html += this.renderColumnsTable(source.columns);
    }

    if (downstream.length > 0) {
      html += `<h2>Referenced By (${downstream.length})</h2><ul>`;
      for (const id of downstream) html += `<li><code>${idToName(id)}</code></li>`;
      html += `</ul>`;
    }

    return this.wrapHtml(html);
  }

  private renderIndex(): string {
    const m = this.currentManifest!;
    const folders = new Map<string, DvtManifestNode[]>();

    for (const node of Object.values(m.nodes)) {
      const folder = node.folder || '(root)';
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder)!.push(node);
    }

    let html = `
      <h1>${m.project.name}</h1>
      <p>${m.stats.modelCount} models, ${m.stats.sourceCount} sources</p>
    `;

    // Models by folder
    html += `<h2>Models</h2>`;
    for (const [folder, nodes] of [...folders.entries()].sort()) {
      html += `<h3>${folder}</h3><ul>`;
      for (const node of nodes.sort((a, b) => a.name.localeCompare(b.name))) {
        const desc = node.description ? ` — ${escapeHtml(node.description.slice(0, 80))}` : '';
        html += `<li><code>${node.name}</code>${desc}</li>`;
      }
      html += `</ul>`;
    }

    // Sources
    const sourceGroups = new Map<string, DvtManifestSource[]>();
    for (const source of Object.values(m.sources)) {
      if (!sourceGroups.has(source.sourceName)) sourceGroups.set(source.sourceName, []);
      sourceGroups.get(source.sourceName)!.push(source);
    }

    if (sourceGroups.size > 0) {
      html += `<h2>Sources</h2>`;
      for (const [name, sources] of [...sourceGroups.entries()].sort()) {
        html += `<h3>${name}</h3><ul>`;
        for (const s of sources.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
          const desc = s.description ? ` — ${escapeHtml(s.description.slice(0, 80))}` : '';
          html += `<li><code>${s.tableName}</code>${desc}</li>`;
        }
        html += `</ul>`;
      }
    }

    return this.wrapHtml(html);
  }

  private renderColumnsTable(columns: DbtColumn[]): string {
    let html = `<table><thead><tr><th>Column</th><th>Type</th><th>Description</th><th>Tests</th></tr></thead><tbody>`;
    for (const col of columns) {
      html += `<tr>
        <td><code>${escapeHtml(col.name)}</code></td>
        <td>${col.dataType ? escapeHtml(col.dataType) : ''}</td>
        <td>${col.description ? escapeHtml(col.description) : ''}</td>
        <td>${(col.tests || []).map((t) => `<span class="badge test">${escapeHtml(t)}</span>`).join(' ')}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  private wrapHtml(body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #CCC; background: #1E1E1E;
    padding: 16px 24px; line-height: 1.6;
  }
  h1 { color: #E8E8E8; font-size: 20px; margin: 0 0 8px; }
  h2 { color: #CCC; font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  h3 { color: #AAA; font-size: 13px; margin: 16px 0 4px; }
  p { margin: 4px 0; }
  .path { color: #888; font-size: 12px; font-family: monospace; }
  .meta { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
  .badge {
    font-size: 11px; padding: 2px 8px; border-radius: 3px;
    background: #333; color: #CCC;
  }
  .badge.model { background: #2D4A7A; color: #E8F0FE; }
  .badge.source { background: #2A5A3A; color: #E6F7ED; }
  .badge.folder { background: #3A3A3A; }
  .badge.mat { background: #4A3A2A; color: #FEF3E2; }
  .badge.tag { background: #3A2A4A; color: #F3E8FE; }
  .badge.test { background: #2A3A4A; color: #E0F0FF; font-size: 10px; }
  .description { margin: 12px 0; color: #DDD; }
  code { background: #2A2A2A; padding: 1px 4px; border-radius: 2px; font-size: 13px; }
  ul { padding-left: 20px; }
  li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  th { text-align: left; border-bottom: 1px solid #444; padding: 6px 8px; color: #AAA; font-weight: 500; }
  td { border-bottom: 1px solid #2A2A2A; padding: 5px 8px; }
  tr:hover td { background: #252525; }
</style>
</head>
<body>${body}</body>
</html>`;
  }
}

function idToName(id: string): string {
  const parts = id.split('.');
  if (parts[0] === 'source') return `${parts[2]}.${parts[3]}`;
  return parts[parts.length - 1];
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
