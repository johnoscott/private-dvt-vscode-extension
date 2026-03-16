import * as vscode from 'vscode';
import { refAtPosition } from './ref-resolver.js';
import { manifestToGraph } from '../../core/dbt/manifest.js';
import type { DvtManifest } from '../../core/dbt/manifest.js';

export type ProjectResolver = (filePath: string) => { manifest: DvtManifest; root: string } | undefined;

/**
 * Hover info for ref() and source() in jinja-sql files.
 * Shows model/source metadata, upstream/downstream counts.
 */
export class DbtHoverProvider implements vscode.HoverProvider {
  constructor(private resolveProject: ProjectResolver) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const ref = refAtPosition(document, position);
    if (!ref) return undefined;

    const project = this.resolveProject(document.uri.fsPath);
    if (!project) return undefined;

    const { manifest } = project;

    if (ref.type === 'ref') {
      return this.hoverRef(manifest, ref.model, ref.range);
    } else {
      return this.hoverSource(manifest, ref.source, ref.table, ref.range);
    }
  }

  private hoverRef(manifest: DvtManifest, modelName: string, range: vscode.Range): vscode.Hover | undefined {
    const nodeId = `model.${manifest.project.name}.${modelName}`;
    const node = manifest.nodes[nodeId];
    if (!node) {
      return new vscode.Hover(
        new vscode.MarkdownString(`$(warning) Model \`${modelName}\` not found in project`),
        range,
      );
    }

    const graph = manifestToGraph(manifest);
    const upstream = graph.ancestors(nodeId);
    const downstream = graph.descendants(nodeId);
    const directParents = graph.predecessors(nodeId);
    const directChildren = graph.successors(nodeId);

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;

    md.appendMarkdown(`### $(symbol-class) ${modelName}\n\n`);

    if (node.folder) {
      md.appendMarkdown(`**Folder:** \`${node.folder}\`\n\n`);
    }

    if (node.description) {
      md.appendMarkdown(`${node.description}\n\n`);
    }

    md.appendMarkdown(`**File:** \`${node.relativePath}\`\n\n`);

    // Dependencies
    if (directParents.length > 0) {
      md.appendMarkdown(`**Depends on** (${directParents.length}): `);
      md.appendMarkdown(directParents.map((id) => `\`${idToName(id)}\``).join(', '));
      md.appendMarkdown('\n\n');
    }

    if (directChildren.length > 0) {
      md.appendMarkdown(`**Used by** (${directChildren.length}): `);
      md.appendMarkdown(directChildren.map((id) => `\`${idToName(id)}\``).join(', '));
      md.appendMarkdown('\n\n');
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`$(arrow-up) ${upstream.length} upstream \u00b7 $(arrow-down) ${downstream.length} downstream`);

    return new vscode.Hover(md, range);
  }

  private hoverSource(
    manifest: DvtManifest,
    sourceName: string,
    tableName: string,
    range: vscode.Range,
  ): vscode.Hover | undefined {
    const sourceId = `source.${manifest.project.name}.${sourceName}.${tableName}`;
    const source = manifest.sources[sourceId];
    if (!source) {
      return new vscode.Hover(
        new vscode.MarkdownString(`$(warning) Source \`${sourceName}.${tableName}\` not found`),
        range,
      );
    }

    const graph = manifestToGraph(manifest);
    const downstream = graph.descendants(sourceId);

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;

    md.appendMarkdown(`### $(database) ${sourceName}.${tableName}\n\n`);

    if (source.description) {
      md.appendMarkdown(`${source.description}\n\n`);
    }

    if (source.database) md.appendMarkdown(`**Database:** \`${source.database}\`\n\n`);
    if (source.schema) md.appendMarkdown(`**Schema:** \`${source.schema}\`\n\n`);

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`$(arrow-down) ${downstream.length} downstream models`);

    return new vscode.Hover(md, range);
  }
}

function idToName(id: string): string {
  const parts = id.split('.');
  if (parts[0] === 'source') {
    return `${parts[2]}.${parts[3]}`;
  }
  return parts[parts.length - 1];
}
