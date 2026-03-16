import * as vscode from 'vscode';
import { findAllRefs } from './ref-resolver.js';
import type { DvtManifest } from '../../core/dbt/manifest.js';

export type ProjectResolver = (filePath: string) => { manifest: DvtManifest; root: string } | undefined;

/**
 * Clickable underlines for ref() and source() in jinja-sql files.
 * Clicking a link navigates to the target model/source.
 */
export class DbtDocumentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(private resolveProject: ProjectResolver) {}

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const project = this.resolveProject(document.uri.fsPath);
    if (!project) return [];

    const { manifest } = project;
    const refs = findAllRefs(document);
    const links: vscode.DocumentLink[] = [];

    for (const ref of refs) {
      let targetUri: vscode.Uri | undefined;
      let tooltip: string;

      if (ref.type === 'ref') {
        const nodeId = `model.${manifest.project.name}.${ref.model}`;
        const node = manifest.nodes[nodeId];
        if (node?.filePath) {
          targetUri = vscode.Uri.file(node.filePath);
          tooltip = `Go to model: ${ref.model}`;
        } else {
          tooltip = `Model not found: ${ref.model}`;
        }
      } else {
        tooltip = `source: ${ref.source}.${ref.table}`;
        // Source links use go-to-definition (resolving YAML location is async)
      }

      if (targetUri) {
        const link = new vscode.DocumentLink(ref.nameRange, targetUri);
        link.tooltip = tooltip;
        links.push(link);
      }
    }

    return links;
  }
}
