import * as vscode from 'vscode';
import type { DvtManifest } from '../../core/dbt/manifest.js';

export type ProjectResolver = (filePath: string) => { manifest: DvtManifest; root: string } | undefined;

/**
 * Auto-completion for ref() and source() in jinja-sql files.
 *
 * - Inside ref('  → completes model names
 * - Inside source(' → completes source names
 * - Inside source('src_name', ' → completes table names for that source
 */
export class DbtCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private resolveProject: ProjectResolver) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] | undefined {
    const project = this.resolveProject(document.uri.fsPath);
    if (!project) return undefined;

    const lineText = document.lineAt(position.line).text;
    const textBefore = lineText.substring(0, position.character);

    // Check if we're inside ref('...')
    const refMatch = textBefore.match(/\{\{\s*ref\(\s*['"]([^'"]*)$/);
    if (refMatch) {
      return this.completeModelNames(project.manifest, refMatch[1]);
    }

    // Check if we're inside source('src', '...')  (second argument)
    const sourceTableMatch = textBefore.match(/\{\{\s*source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)$/);
    if (sourceTableMatch) {
      return this.completeSourceTables(project.manifest, sourceTableMatch[1], sourceTableMatch[2]);
    }

    // Check if we're inside source('...')  (first argument)
    const sourceMatch = textBefore.match(/\{\{\s*source\(\s*['"]([^'"]*)$/);
    if (sourceMatch) {
      return this.completeSourceNames(project.manifest, sourceMatch[1]);
    }

    return undefined;
  }

  private completeModelNames(manifest: DvtManifest, prefix: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    for (const node of Object.values(manifest.nodes)) {
      if (prefix && !node.name.toLowerCase().startsWith(prefix.toLowerCase())) continue;

      const item = new vscode.CompletionItem(node.name, vscode.CompletionItemKind.Reference);
      item.detail = node.folder ? `model (${node.folder})` : 'model';
      if (node.description) {
        item.documentation = new vscode.MarkdownString(node.description);
      }
      item.sortText = node.name;
      items.push(item);
    }

    return items;
  }

  private completeSourceNames(manifest: DvtManifest, prefix: string): vscode.CompletionItem[] {
    // Collect unique source names
    const sourceNames = new Set<string>();
    for (const source of Object.values(manifest.sources)) {
      sourceNames.add(source.sourceName);
    }

    const items: vscode.CompletionItem[] = [];
    for (const name of sourceNames) {
      if (prefix && !name.toLowerCase().startsWith(prefix.toLowerCase())) continue;

      const tableCount = Object.values(manifest.sources).filter((s) => s.sourceName === name).length;
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Module);
      item.detail = `source (${tableCount} tables)`;
      item.sortText = name;
      items.push(item);
    }

    return items;
  }

  private completeSourceTables(
    manifest: DvtManifest,
    sourceName: string,
    prefix: string,
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    for (const source of Object.values(manifest.sources)) {
      if (source.sourceName !== sourceName) continue;
      if (prefix && !source.tableName.toLowerCase().startsWith(prefix.toLowerCase())) continue;

      const item = new vscode.CompletionItem(source.tableName, vscode.CompletionItemKind.Field);
      item.detail = `${sourceName}.${source.tableName}`;
      if (source.description) {
        item.documentation = new vscode.MarkdownString(source.description);
      }
      if (source.schema) {
        item.detail += ` (${source.schema})`;
      }
      item.sortText = source.tableName;
      items.push(item);
    }

    return items;
  }
}
