import * as vscode from 'vscode';
import { findAllRefs } from './ref-resolver.js';
import type { DvtManifest } from '../../core/dbt/manifest.js';

export type ProjectResolver = (filePath: string) => { manifest: DvtManifest; root: string } | undefined;

/**
 * Diagnostics for broken ref() and source() references in jinja-sql files.
 * Shows warning squigglies for references that don't resolve to known models/sources.
 */
export class DbtDiagnosticsProvider {
  private collection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor(private resolveProject: ProjectResolver) {
    this.collection = vscode.languages.createDiagnosticCollection('dvt');
  }

  activate(context: vscode.ExtensionContext) {
    // Validate on open
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((doc) => this.validate(doc)),
    );

    // Validate on save
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => this.validate(doc)),
    );

    // Validate on edit (debounced)
    let timer: ReturnType<typeof setTimeout> | undefined;
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => this.validate(e.document), 500);
      }),
    );

    // Clean up when document is closed
    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((doc) => this.collection.delete(doc.uri)),
    );

    // Validate all open documents
    for (const doc of vscode.workspace.textDocuments) {
      this.validate(doc);
    }

    context.subscriptions.push(this.collection);
  }

  /** Revalidate all open documents (e.g., after manifest rebuild) */
  revalidateAll() {
    for (const doc of vscode.workspace.textDocuments) {
      this.validate(doc);
    }
  }

  private validate(document: vscode.TextDocument) {
    if (document.languageId !== 'jinja-sql') return;

    const project = this.resolveProject(document.uri.fsPath);
    if (!project) {
      this.collection.delete(document.uri);
      return;
    }

    const { manifest } = project;
    const refs = findAllRefs(document);
    const diagnostics: vscode.Diagnostic[] = [];

    for (const ref of refs) {
      if (ref.type === 'ref') {
        const nodeId = `model.${manifest.project.name}.${ref.model}`;
        if (!manifest.nodes[nodeId]) {
          const diag = new vscode.Diagnostic(
            ref.nameRange,
            `Model '${ref.model}' not found in project '${manifest.project.name}'`,
            vscode.DiagnosticSeverity.Warning,
          );
          diag.source = 'dvt';
          diag.code = 'unknown-ref';
          diagnostics.push(diag);
        }
      } else {
        const sourceId = `source.${manifest.project.name}.${ref.source}.${ref.table}`;
        if (!manifest.sources[sourceId]) {
          const diag = new vscode.Diagnostic(
            ref.nameRange,
            `Source '${ref.source}.${ref.table}' not found in project '${manifest.project.name}'`,
            vscode.DiagnosticSeverity.Warning,
          );
          diag.source = 'dvt';
          diag.code = 'unknown-source';
          diagnostics.push(diag);
        }
      }
    }

    this.collection.set(document.uri, diagnostics);
  }
}
