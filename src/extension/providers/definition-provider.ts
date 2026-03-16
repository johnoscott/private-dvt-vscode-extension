import * as vscode from 'vscode';
import { refAtPosition } from './ref-resolver.js';
import type { DvtManifest } from '../../core/dbt/manifest.js';

export type ProjectResolver = (filePath: string) => { manifest: DvtManifest; root: string } | undefined;

/**
 * Go-to-definition for ref() and source() in jinja-sql files.
 * Cmd+Click or F12 on {{ ref('model') }} jumps to the model's .sql file.
 * Cmd+Click on {{ source('src', 'table') }} jumps to the source definition in YAML.
 */
export class DbtDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private resolveProject: ProjectResolver) {}

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Definition | undefined {
    const ref = refAtPosition(document, position);
    if (!ref) return undefined;

    const project = this.resolveProject(document.uri.fsPath);
    if (!project) return undefined;

    const { manifest } = project;

    if (ref.type === 'ref') {
      const nodeId = `model.${manifest.project.name}.${ref.model}`;
      const node = manifest.nodes[nodeId];
      if (node?.filePath) {
        return new vscode.Location(vscode.Uri.file(node.filePath), new vscode.Position(0, 0));
      }
    } else {
      // source — find the YAML file that defines it
      const sourceId = `source.${manifest.project.name}.${ref.source}.${ref.table}`;
      const source = manifest.sources[sourceId];
      if (source) {
        // Search YAML files for the source definition
        return this.findSourceInYaml(project.root, ref.source, ref.table);
      }
    }

    return undefined;
  }

  private findSourceInYaml(
    projectRoot: string,
    sourceName: string,
    tableName: string,
  ): vscode.Location | undefined {
    // Search for YAML files containing the source definition
    const fs = require('fs');
    const path = require('path');
    const yaml = require('yaml');

    const yamlFiles = this.findYamlFiles(projectRoot);
    for (const yamlPath of yamlFiles) {
      try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const doc = yaml.parse(content);
        if (!doc?.sources) continue;

        for (const src of doc.sources) {
          if (src.name !== sourceName) continue;
          if (!src.tables) continue;

          for (const table of src.tables) {
            if (table.name === tableName) {
              // Find the line number of this table in the YAML
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(`name: ${tableName}`) || lines[i].includes(`name: '${tableName}'`)) {
                  return new vscode.Location(vscode.Uri.file(yamlPath), new vscode.Position(i, 0));
                }
              }
              // Fallback to file start
              return new vscode.Location(vscode.Uri.file(yamlPath), new vscode.Position(0, 0));
            }
          }
        }
      } catch {
        // Skip unparseable files
      }
    }
    return undefined;
  }

  private findYamlFiles(dir: string): string[] {
    const fs = require('fs');
    const path = require('path');
    const results: string[] = [];
    const SKIP = new Set(['target', 'dbt_packages', 'node_modules', '.git', 'logs']);

    const walk = (d: string) => {
      try {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            if (!SKIP.has(entry.name)) walk(path.join(d, entry.name));
          } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
            results.push(path.join(d, entry.name));
          }
        }
      } catch {}
    };
    walk(dir);
    return results;
  }
}
